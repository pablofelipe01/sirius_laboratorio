import { NextResponse } from 'next/server';

interface FormulaComponent {
  cantidad: number;
  unidad: string;
  descripcion: string;
  categoria?: string;
}

interface Formula {
  [key: string]: FormulaComponent;
}

// Función para parsear fórmulas de variables de entorno
function parseFormula(envVar: string | undefined): Formula {
  if (!envVar) return {};
  
  try {
    return JSON.parse(envVar);
  } catch (error) {
    console.error('Error parsing formula:', error);
    return {};
  }
}

export async function GET() {
  try {
    const formulas = {
      FORMULA_BACILLUS: parseFormula(process.env.FORMULA_BACILLUS),
      FORMULA_AZOTOBACTER: parseFormula(process.env.FORMULA_AZOTOBACTER),
      FORMULA_AZOSPIRILLUM: parseFormula(process.env.FORMULA_AZOSPIRILLUM),
      FORMULA_PSEUDOMONAS: parseFormula(process.env.FORMULA_PSEUDOMONAS),
      FORMULA_SIRIUSBACTER_COMPLETA: parseFormula(process.env.FORMULA_SIRIUSBACTER_COMPLETA),
      FORMULA_BASE: parseFormula(process.env.FORMULA_BASE)
    };

    return NextResponse.json(formulas);
  } catch (error) {
    console.error('Error loading formulas:', error);
    return NextResponse.json({ error: 'Failed to load formulas' }, { status: 500 });
  }
}