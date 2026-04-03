import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  type SandboxConfig = {
    hours: { id: string; start: number; end: number }[];
    staffs: { id: string; name: string; role: string; color: string; status: string; commissionRate: number }[];
    categories: { id: string; name: string }[];
    services: { id: string; name: string; duration: number; prices: number[]; assignedEmployeeId: string }[];
  };

  const configs: Record<string, SandboxConfig> = {
    default: {
      hours: [
        { id: "1", start: 9, end: 12 },
        { id: "2", start: 15, end: 20 }
      ],
      staffs: [
        { id: "A", name: "A", role: "资深技师", color: "#00f0ff", status: "active", commissionRate: 50 },
        { id: "B", name: "B", role: "资深技师", color: "#a855f7", status: "active", commissionRate: 50 },
        { id: "C", name: "C", role: "高级技师", color: "#10b981", status: "active", commissionRate: 40 },
        { id: "D", name: "D", role: "高级技师", color: "#f59e0b", status: "active", commissionRate: 40 },
        { id: "E", name: "E", role: "见习技师", color: "#ec4899", status: "active", commissionRate: 30 }
      ],
      categories: [
        { id: "MANI", name: "MANI" },
        { id: "PEDI", name: "PEDI" }
      ],
      services: [
        { id: "S1", name: "Basic Mani", duration: 60, prices: [198, 258], assignedEmployeeId: "A" },
        { id: "S2", name: "Spa Pedi", duration: 90, prices: [298, 358], assignedEmployeeId: "B" }
      ]
    }
  };

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  const bookings = [
    { id: "BKG-1", shopId: "default", date: dateStr, startTime: "10:00", duration: 60, resourceId: "A", customerId: "GV 0015", services: [{ id: "S1", name: "Basic Mani", prices: [198], duration: 60 }] },
    { id: "BKG-2", shopId: "default", date: dateStr, startTime: "11:30", duration: 90, resourceId: "B", customerId: "AD 3001", services: [{ id: "S2", name: "Spa Pedi", prices: [298], duration: 90 }] }
  ];

  return NextResponse.json({ bookings, configs });
}
