import { useState } from "react";
import BookingModal from "../components/BookingModal";
import {
  createBooking,
  createPaymentOrder,
  verifyPayment,
  confirmBookingWithoutPayment
} from "../api/client";
import { useAppState } from "../state/AppContext";

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function BookingPage() {
  const { selectedAdvocate, booking, setBooking } = useAppState();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const handleCreateBooking = async (payload) => {
    try {
      setError("");
      const created = await createBooking(payload);
      setBooking(created);
      setStatus("Booking created. Proceed to payment.");
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePayNow = async () => {
    try {
      setError("");
      if (!booking?._id) {
        throw new Error("Create a booking first");
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Razorpay SDK failed to load");
      }

      const order = await createPaymentOrder(booking._id);

      const paymentResponse = await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.key,
          amount: order.amount,
          currency: order.currency,
          name: "Vakil Setu",
          description: "Legal Consultation Booking",
          order_id: order.orderId,
          handler: resolve,
          prefill: {},
          theme: { color: "#d11a2a" },
          modal: {
            ondismiss: () => reject(new Error("Payment was cancelled"))
          }
        });
        rzp.open();
      });

      await verifyPayment({
        bookingId: booking._id,
        razorpayOrderId: paymentResponse.razorpay_order_id,
        razorpayPaymentId: paymentResponse.razorpay_payment_id,
        razorpaySignature: paymentResponse.razorpay_signature
      });

      setStatus("Payment verified. Booking confirmed.");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSkipPayment = async () => {
    try {
      setError("");
      if (!booking?._id) {
        throw new Error("Create a booking first");
      }

      await confirmBookingWithoutPayment(booking._id);
      setStatus("Booking confirmed without payment.");
    } catch (err) {
      setError(err.message);
    }
  };

  if (!selectedAdvocate) {
    return (
      <main className="container">
        <section className="hero compact">
          <p className="eyebrow">Consultation</p>
          <h1>Booking</h1>
        </section>
        <p>Select an advocate first from Results page.</p>
      </main>
    );
  }

  return (
    <main className="container">
      <section className="hero compact">
        <p className="eyebrow">Consultation</p>
        <h1>Booking & Payment</h1>
      </section>
      <BookingModal advocate={selectedAdvocate} onCreate={handleCreateBooking} />
      {booking?._id ? (
        <div className="action-row">
          <button onClick={handlePayNow}>Pay & Confirm</button>
          <button onClick={handleSkipPayment} className="secondary-btn">
            Skip Payment & Confirm
          </button>
        </div>
      ) : null}
      {status ? <p className="success">{status}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
