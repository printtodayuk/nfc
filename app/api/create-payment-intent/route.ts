import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { amount, currency = 'gbp' } = await req.json();

    // Fetch Stripe secret key from Firestore
    const settingsDoc = await getDoc(doc(db, 'settings', 'site'));
    const stripeSecretKey = settingsDoc.data()?.stripeSecretKey;

    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please add the Secret Key in the Admin Panel.' },
        { status: 400 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects amount in pence
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error: any) {
    console.error('Stripe error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
