import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    const indexPath = path.join(UPLOAD_DIR, 'index.json');
    let list: { id: string; titulo: string; [key: string]: unknown }[] = [];
    try {
      const raw = await fs.readFile(indexPath, 'utf8');
      list = JSON.parse(raw);
    } catch {
      list = [];
    }

    if (id) {
      return NextResponse.json(list.filter((d) => d.id === id));
    }
    const q = searchParams.get('q') || '';
    const results = list.filter((d) => String(d.titulo).toLowerCase().includes(q.toLowerCase()));
    return NextResponse.json(results);
  } catch (err) {
    const error = err as Error;
    return new NextResponse(error.message || String(err), { status: 500 });
  }
}
