import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { LoginSchema, SetPasswordSchema, validateData } from '@/lib/validation/schemas';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';

// Validar configuración requerida
if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
  throw new Error('Variables de entorno AIRTABLE_API_KEY y AIRTABLE_BASE_ID son requeridas');
}

// Configurar Airtable de forma segura
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID);

// Login endpoint - POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json();
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    console.log('🔐 Login attempt:', {
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

    // Buscar usuario por cédula en Airtable
    const tableId = process.env.AIRTABLE_TABLE_EQUIPO_LABORATORIO;
    
    if (!tableId) {
      throw new Error('Missing AIRTABLE_TABLE_EQUIPO_LABORATORIO environment variable');
    }

    const records = await base(tableId)
      .select({
        filterByFormula: `{Cedula} = "${data.cedula}"`,
        maxRecords: 1
      })
      .firstPage();

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado. Contacte al administrador.' },
        { status: 404 }
      );
    }

    const userRecord = records[0];
    const existingPassword = userRecord.get('Contraseña') as string;
    const userName = userRecord.get('Nombre') as string;

    // Caso 1: Usuario no tiene contraseña, necesita configurar una
    if (!existingPassword && isSetPassword) {
      const { hash, salt, hashedPassword } = await hashPassword(data.password!);

      // Actualizar registro con nueva contraseña
      await base(tableId).update([
        {
          id: userRecord.id,
          fields: {
            'Contraseña': hashedPassword,
            'Hash': hash,
            'Salt': salt
          }
        }
      ]);

      // Generar JWT token
      const token = await signToken({
        userId: userRecord.id,
        cedula: data.cedula,
        nombre: userName
      });

      console.log('✅ Password set successfully:', {
        userId: userRecord.id,
        cedula: data.cedula?.substring(0, 3) + '***',
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: 'Contraseña configurada exitosamente',
        token,
        user: {
          id: userRecord.id,
          cedula: data.cedula,
          nombre: userName
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
          nombre: userName
        }
      });
    }

    // Caso 3: Usuario tiene contraseña, validar login
    if (existingPassword && data.password) {
      const isPasswordValid = await verifyPassword(data.password, existingPassword);

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Contraseña incorrecta' },
          { status: 401 }
        );
      }

      // Generar JWT token
      const token = await signToken({
        userId: userRecord.id,
        cedula: data.cedula,
        nombre: userName
      });

      console.log('✅ Login successful:', {
        userId: userRecord.id,
        cedula: data.cedula?.substring(0, 3) + '***',
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: 'Login exitoso',
        token,
        user: {
          id: userRecord.id,
          cedula: data.cedula,
          nombre: userName
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
          nombre: userName
        }
      });
    }

    return NextResponse.json(
      { error: 'Estado de autenticación inválido' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error en API de autenticación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
