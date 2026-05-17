import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { jwtToken, port } = await request.json();
    
    if (!jwtToken) {
      return NextResponse.json({ success: false, error: 'Token missing' }, { status: 400 });
    }

    const slots = [];
    
    // Always return a slot in simulation so the Refresh button visibly works
    slots.push({
      id: Date.now(),
      port: port || 'جمرك البطحاء', 
      time: `2026-05-18 -> ${new Date().toLocaleTimeString('ar-SA')}`, // Show real-time clock to prove refresh works
      availableTrucks: Math.floor(Math.random() * 5) + 1,
      status: 'Available',
      type: 'Import'
    });

    return NextResponse.json({ success: true, slots });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
