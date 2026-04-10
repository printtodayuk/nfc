'use client';

import React, { useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Download, FileText, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  variant?: { color?: string; size?: string };
}

interface Address {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface Order {
  id: string;
  createdAt: any;
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: Address;
  userEmail: string;
}

export default function Invoice({ order }: { order: Order }) {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const downloadPDF = async () => {
    if (!invoiceRef.current) return;
    
    const canvas = await html2canvas(invoiceRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`invoice-${order.id.substring(0, 8)}.pdf`);
  };

  const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 no-print">
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" /> Print
        </Button>
        <Button size="sm" onClick={downloadPDF} className="gap-2">
          <Download className="h-4 w-4" /> Download PDF
        </Button>
      </div>

      <div 
        ref={invoiceRef} 
        className="bg-white text-black p-8 border rounded-lg shadow-sm max-w-2xl mx-auto font-sans"
        style={{ minHeight: '297mm' }}
      >
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-1">INVOICE</h1>
            <p className="text-sm text-gray-500">Order #{order.id.substring(0, 8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold">Today AI Store</h2>
            <p className="text-xs text-gray-500">123 E-commerce St, Digital City</p>
            <p className="text-xs text-gray-500">support@todayai.com</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10 mb-10">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Bill To</h3>
            <div className="text-sm space-y-1">
              <p className="font-bold">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.street}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
              <p>{order.shippingAddress.country}</p>
              <p className="text-gray-500 mt-2">{order.userEmail}</p>
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Order Details</h3>
            <div className="text-sm space-y-1">
              <div className="flex justify-end gap-4">
                <span className="text-gray-500">Date:</span>
                <span className="font-medium">{date.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-end gap-4">
                <span className="text-gray-500">Status:</span>
                <span className="font-medium uppercase">Paid</span>
              </div>
            </div>
          </div>
        </div>

        <table className="w-full mb-10">
          <thead>
            <tr className="border-b-2 border-black text-left text-xs font-bold uppercase tracking-widest">
              <th className="py-3">Description</th>
              <th className="py-3 text-center">Qty</th>
              <th className="py-3 text-right">Price</th>
              <th className="py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {order.items.map((item, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-4">
                  <p className="font-bold">{item.name}</p>
                  {item.variant && (
                    <p className="text-xs text-gray-500">
                      {item.variant.color && `Color: ${item.variant.color}`}
                      {item.variant.color && item.variant.size && ' | '}
                      {item.variant.size && `Size: ${item.variant.size}`}
                    </p>
                  )}
                </td>
                <td className="py-4 text-center">{item.quantity}</td>
                <td className="py-4 text-right">£{item.price.toFixed(2)}</td>
                <td className="py-4 text-right font-bold">£{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>£{order.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Shipping</span>
              <span>£0.00</span>
            </div>
            <div className="flex justify-between border-t-2 border-black pt-2 font-black text-xl">
              <span>TOTAL</span>
              <span>£{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-20 pt-10 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">Thank you for your business!</p>
          <p className="text-[10px] text-gray-300 mt-2">Today AI Store - Premium Lifestyle Products</p>
        </div>
      </div>
    </div>
  );
}
