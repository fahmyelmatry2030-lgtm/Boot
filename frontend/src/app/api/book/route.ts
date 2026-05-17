import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { jwtToken, slotId, truckId } = await request.json();
    
    // Simulate API delay for Fasah booking
    await new Promise(resolve => setTimeout(resolve, 800));

    // Return success
    return NextResponse.json({ 
      success: true, 
      message: 'Booked successfully', 
      reference: `FASAH-${Math.floor(Math.random() * 1000000)}` 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
