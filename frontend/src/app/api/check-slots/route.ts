import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { jwtToken, port } = await request.json();
    
    if (!jwtToken) {
      return NextResponse.json({ success: false, error: 'Token missing' }, { status: 400 });
    }

    const slots = [];
    
    // 30% chance to find a slot to simulate radar waiting
    if (Math.random() > 0.7) { 
      slots.push({
        id: Date.now(),
        port: port || 'جمرك البطحاء', // Use the selected port dynamically
        time: `2026-05-18 -> ${Math.floor(Math.random() * 12 + 1)}:00`,
        availableTrucks: Math.floor(Math.random() * 5) + 1,
        status: 'Available',
        type: 'Import'
      });
    }

    return NextResponse.json({ success: true, slots });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
