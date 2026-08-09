import { useEffect } from "react";

// এই হুক ব্যবহার করলে মোবাইলের হার্ডওয়্যার ব্যাক বাটন বা ব্রাউজারের ব্যাক
// চাপলে পুরো অ্যাপ থেকে বের হয়ে না গিয়ে শুধু এই মডাল/ওভারলে-টা বন্ধ হবে।
//
// কাজ করে যেভাবে: মডাল খোলার সময় history-তে একটা ডামি state push করা হয়।
// ব্যাক চাপলে সেই state pop হয়ে যায় (popstate ইভেন্ট ফায়ার করে), তখন onClose()
// কল করে মডাল বন্ধ করে দেওয়া হয়। মডাল যদি অন্য কোনো বাটন (X/Cancel) দিয়ে বন্ধ
// করা হয়, তাহলে cleanup-এ আমরা নিজেরাই সেই ডামি state consume করে নিই যাতে
// history স্ট্যাকে অপ্রয়োজনীয় এন্ট্রি জমে না থাকে।
export default function useBackButtonClose(onClose) {
  useEffect(() => {
    let active = true;
    window.history.pushState({ __modal: true }, "");

    function handlePopState() {
      if (!active) return;
      onClose();
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      active = false;
      window.removeEventListener("popstate", handlePopState);
      // ব্যাক বাটন দিয়ে বন্ধ না হয়ে থাকলে (অর্থাৎ আমাদের push করা state এখনো
      // current), সেটা নিজে থেকে pop করে নাও যাতে history clean থাকে।
      if (window.history.state && window.history.state.__modal) {
        window.history.back();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
