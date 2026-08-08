import { NextResponse } from 'next/server';

/** Les messages restent en historique — suppression désactivée. */
export async function DELETE() {
  return NextResponse.json(
    { error: 'Les messages restent en historique et ne peuvent pas être supprimés.' },
    { status: 405 },
  );
}
