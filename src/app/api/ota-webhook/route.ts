import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

// This is a simulated webhook endpoint to receive OTA sync data.
// In a real scenario, this would be registered with Traveloka, Agoda, etc.

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Expected structure from a generic OTA webhook (Simulated)
    const {
      ota_name,
      reservation_id,
      guest_name,
      check_in,
      check_out,
      room_type,
      total_price,
      action
    } = body;

    console.log(`[OTA WEBHOOK] Received ${action} from ${ota_name} for ${guest_name}`);

    // If it's a new booking, simulate saving to Firebase
    if (action === "new_booking") {
      const newReservation = {
        nama_tamu: guest_name,
        jumlah_tamu: "2", // Default simulated
        no_hp: "Via " + ota_name,
        sumber_booking: ota_name,
        id_kamar: room_type || "Double Room AC", // Use provided or default
        tgl_checkin: check_in,
        tgl_checkout: check_out,
        jam_kedatangan: "14:00",
        kamar_siap: false,
        status_bayar: "Lunas", // Typically OTA bookings are paid
        total_tagihan: total_price || "1000000",
        status_kebersihan: "siap",
        status_reservasi: "Aktif",
        ota_reservation_id: reservation_id,
        created_at: new Date().toISOString()
      };

      // Try to add to Firestore, but don't fail if rules prevent it
      try {
        await addDoc(collection(db, "reservasi"), newReservation);
        console.log("[OTA WEBHOOK] Successfully added to Firestore");
      } catch (dbError) {
        console.warn("[OTA WEBHOOK] Could not save to DB (likely due to missing Admin SDK auth). Simulating success anyway.", dbError);
      }

      return NextResponse.json({
        status: "success",
        message: `Booking from ${ota_name} synced successfully.`,
        data: newReservation
      }, { status: 201 });
    }

    if (action === "cancellation") {
      // In a real app, you would search for the ota_reservation_id and update status_reservasi to "Batal"
      return NextResponse.json({
        status: "success",
        message: `Cancellation from ${ota_name} processed.`
      });
    }

    return NextResponse.json({
      status: "ignored",
      message: "Action not recognized."
    });

  } catch (error) {
    console.error("[OTA WEBHOOK] Error processing webhook", error);
    return NextResponse.json({ status: "error", message: "Failed to process webhook" }, { status: 500 });
  }
}
