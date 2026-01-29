import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { LoginSchema, SetPasswordSchema, validateData } from '@/lib/validation/schemas';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 SIRIUS NOMINA CORE - Sistema de autenticación con tabla Personal
// ═══════════════════════════════════════════════════════════════════════════════

// Validar configuración requerida para Sirius Nomina Core
const NOMINA_API_KEY = process.env.AIRTABLE_API_KEY_SIRIUS_NOMINA_CORE;
const NOMINA_BASE_ID = process.env.AIRTABLE_BASE_ID_SIRIUS_NOMINA_CORE;
const PERSONAL_TABLE_ID = process.env.AIRTABLE_TABLE_NOMINA_PERSONAL;
const SISTEMAS_TABLE_ID = process.env.AIRTABLE_TABLE_NOMINA_SISTEMAS_APLICACIONES;

// ID de la aplicación DataLab - Solo usuarios con acceso a esta app pueden ingresar
const DATALAB_APP_CODE = 'SIRIUS-APP-0001';

if (!NOMINA_API_KEY || !NOMINA_BASE_ID || !PERSONAL_TABLE_ID || !SISTEMAS_TABLE_ID) {
  console.error('❌ Missing Sirius Nomina Core environment variables:', {
    hasApiKey: !!NOMINA_API_KEY,
    hasBaseId: !!NOMINA_BASE_ID,
    hasTableId: !!PERSONAL_TABLE_ID,
    hasSistemasTableId: !!SISTEMAS_TABLE_ID
  });
  throw new Error('Variables de entorno de Sirius Nomina Core son requeridas');
}

// Configurar Airtable para Sirius Nomina Core
const nominaBase = new Airtable({
  apiKey: NOMINA_API_KEY
}).base(NOMINA_BASE_ID);

// Login endpoint - POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json();
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    console.log('🔐 Login attempt (Sirius Nomina Core):', {
      userAgent: userAgent.substring(0, 100),
      timestamp: new Date().toISOString(),
      cedula: rawData.cedula?.substring(0, 3) + '***' // Log partial cedula for security
    });

    // Determinar si es login o setup de contraseña
    const isSetPassword = rawData.password && rawData.confirmPassword;
    const schema = isSetPassword ? SetPasswordSchema : LoginSchema;
    
    // Validar datos de entrada
    const validation = validateData(schema, rawData);
    
    if (!validation.success) {
      console.error('❌ Validation failed:', {
        errors: validation.errors,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json({ 
        error: 'Datos de entrada inválidos',
        details: validation.errors 
      }, { status: 400 });
    }

    const data = validation.data!;

    // Buscar usuario por Numero Documento en tabla Personal
    const records = await nominaBase(PERSONAL_TABLE_ID!)
      .select({
        filterByFormula: `{Numero Documento} = "${data.cedula}"`,
        maxRecords: 1
      })
      .firstPage();

    if (records.length === 0) {
      console.log('❌ User not found:', data.cedula?.substring(0, 3) + '***');
      return NextResponse.json(
        { error: 'Usuario no encontrado. Contacte al administrador.' },
        { status: 404 }
      );
    }

    const userRecord = records[0];
    const existingPassword = userRecord.get('Password') as string;
    const userName = userRecord.get('Nombre completo') as string;
    const idEmpleado = userRecord.get('ID Empleado') as string;
    const estadoActividad = userRecord.get('Estado de actividad') as string;
    const rolIds = userRecord.get('Rol') as string[] | undefined;
    const accesosIds = userRecord.get('Accesos asignados') as string[] | undefined;

    // Verificar que el usuario esté activo
    if (estadoActividad && estadoActividad !== 'Activo') {
      console.log('❌ User not active:', {
        userId: userRecord.id,
        estado: estadoActividad
      });
      return NextResponse.json(
        { error: `Usuario no activo. Estado: ${estadoActividad}` },
        { status: 403 }
      );
    }

    // Verificar que el usuario tenga acceso a DataLab (SIRIUS-APP-0001)
    let hasDataLabAccess = false;
    
    if (accesosIds && accesosIds.length > 0) {
      // Buscar en la tabla Sistemas y Aplicaciones si alguno de los accesos corresponde a DataLab
      const sistemasRecords = await nominaBase(SISTEMAS_TABLE_ID!)
        .select({
          filterByFormula: `OR(${accesosIds.map(id => `RECORD_ID() = "${id}"`).join(',')})`,
          fields: ['Codigo App', 'Nombre sistema/aplicación']
        })
        .firstPage();

      hasDataLabAccess = sistemasRecords.some(record => 
        record.get('Codigo App') === DATALAB_APP_CODE
      );

      console.log('🔍 Checking DataLab access:', {
        userId: userRecord.id,
        accesosCount: accesosIds.length,
        sistemasFound: sistemasRecords.length,
        hasDataLabAccess
      });
    }

    if (!hasDataLabAccess) {
      console.log('❌ User does not have DataLab access:', {
        userId: userRecord.id,
        idEmpleado: idEmpleado
      });
      return NextResponse.json(
        { error: 'No tienes acceso a esta aplicación (DataLab). Contacta al administrador.' },
        { status: 403 }
      );
    }

    // Caso 1: Usuario no tiene contraseña, necesita configurar una
    if (!existingPassword && isSetPassword) {
      const { hash, salt, hashedPassword } = await hashPassword(data.password!);

      // Actualizar registro con nueva contraseña
      await nominaBase(PERSONAL_TABLE_ID!).update([
        {
          id: userRecord.id,
          fields: {
            'Password': hashedPassword
          }
        }
      ]);

      // Generar JWT token con información extendida
      const token = await signToken({
        userId: userRecord.id,
        cedula: data.cedula,
        nombre: userName,
        idEmpleado: idEmpleado,
        roles: rolIds || [],
        accesos: accesosIds || []
      });

      console.log('✅ Password set successfully (Sirius Nomina Core):', {
        userId: userRecord.id,
        idEmpleado: idEmpleado,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: 'Contraseña configurada exitosamente',
        token,
        user: {
          id: userRecord.id,
          cedula: data.cedula,
          nombre: userName,
          idEmpleado: idEmpleado
        },
        needsPasswordSetup: false
      });
    }

    // Caso 2: Usuario no tiene contraseña, necesita configurarla
    if (!existingPassword && !isSetPassword) {
      return NextResponse.json({
        success: true,
        needsPasswordSetup: true,
        user: {
          id: userRecord.id,
          cedula: data.cedula,
          nombre: userName,
          idEmpleado: idEmpleado
        }
      });
    }

    // Caso 3: Usuario tiene contraseña, validar login
    if (existingPassword && data.password) {
      const isPasswordValid = await verifyPassword(data.password, existingPassword);

      if (!isPasswordValid) {
        console.log('❌ Invalid password for user:', data.cedula?.substring(0, 3) + '***');
        return NextResponse.json(
          { error: 'Contraseña incorrecta' },
          { status: 401 }
        );
      }

      // Generar JWT token con información extendida
      const token = await signToken({
        userId: userRecord.id,
        cedula: data.cedula,
        nombre: userName,
        idEmpleado: idEmpleado,
        roles: rolIds || [],
        accesos: accesosIds || []
      });

      console.log('✅ Login successful (Sirius Nomina Core):', {
        userId: userRecord.id,
        idEmpleado: idEmpleado,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: 'Login exitoso',
        token,
        user: {
          id: userRecord.id,
          cedula: data.cedula,
          nombre: userName,
          idEmpleado: idEmpleado
        },
        needsPasswordSetup: false
      });
    }

    // Caso 4: Usuario tiene contraseña pero no se proporcionó
    if (existingPassword && !data.password) {
      return NextResponse.json({
        success: true,
        needsPassword: true,
        user: {
          id: userRecord.id,
          cedula: data.cedula,
          nombre: userName,
          idEmpleado: idEmpleado
        }
      });
    }

    return NextResponse.json(
      { error: 'Estado de autenticación inválido' },
      { status: 400 }
    );

  } catch (error) {
    console.error('💥 Error en API de autenticación (Sirius Nomina Core):', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
