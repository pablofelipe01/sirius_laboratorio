import { NextResponse } from 'next/server';
import Airtable from 'airtable';

// Configurar Airtable
if (process.env.AIRTABLE_API_KEY) {
  Airtable.configure({ apiKey: process.env.AIRTABLE_API_KEY });
} else if (process.env.AIRTABLE_PAT) {
  Airtable.configure({ apiKey: process.env.AIRTABLE_PAT });
}

const base = Airtable.base(process.env.AIRTABLE_BASE_ID!);

export async function GET() {
  try {
    const tableId = process.env.AIRTABLE_TABLE_EQUIPO_LABORATORIO;
    
    if (!tableId) {
      throw new Error('Missing AIRTABLE_TABLE_EQUIPO_LABORATORIO environment variable');
    }

    const records = await base(tableId)
      .select({
        fields: ['ID', 'Nombre', 'Contraseña', 'Hash', 'Salt', 'ID_Chat', 'Estados Sistemas'],
        sort: [{ field: 'Nombre', direction: 'asc' }]
      })
      .all();

    const usuarios = records.map(record => ({
      id: record.id,
      nombre: record.fields['Nombre'] as string,
      contraseña: record.fields['Contraseña'] as string,
      hash: record.fields['Hash'] as string,
      salt: record.fields['Salt'] as string,
      idChat: record.fields['ID_Chat'] as string, // Usaremos esto para la cédula
      estadoSistemas: record.fields['Estados Sistemas'] as string,
    })).filter(item => item.nombre); // Filtrar los que no tienen nombre

    // Para la respuesta de cosecha, solo necesitamos id y nombre
    const responsables = usuarios.map(usuario => ({
      id: usuario.id,
      nombre: usuario.nombre
    }));

    return NextResponse.json({
      success: true,
      usuarios,
      responsables // Añadir esta línea para compatibilidad con cosecha
    });
  } catch (error) {
    console.error('Error fetching usuarios:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

// Función para actualizar contraseña y hash
export async function PATCH(request: Request) {
  try {
    const { recordId, contraseña, hash, salt } = await request.json();
    
    const tableId = process.env.AIRTABLE_TABLE_EQUIPO_LABORATORIO;
    
    if (!tableId) {
      throw new Error('Missing AIRTABLE_TABLE_EQUIPO_LABORATORIO environment variable');
    }
    
    const updateFields: Record<string, string> = {};
    if (contraseña) updateFields['Contraseña'] = contraseña;
    if (hash) updateFields['Hash'] = hash;
    if (salt) updateFields['Salt'] = salt;
    
    const updatedRecord = await base(tableId).update(recordId, updateFields);

    return NextResponse.json({
      success: true,
      record: updatedRecord
    });
  } catch (error) {
    console.error('Error updating user credentials:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar credenciales' },
      { status: 500 }
    );
  }
}
