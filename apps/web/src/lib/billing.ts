// Vodafone Cash number Fluxio accepts manual subscription payments on.
// Kept in one place so it's never duplicated/typo'd across pages.
export const VODAFONE_CASH_NUMBER = "01069032563";

// wa.me needs the number in international format without the leading 0.
const WHATSAPP_NUMBER = "20" + VODAFONE_CASH_NUMBER.slice(1);

export function buildVodafoneCashWhatsAppLink(params: {
  restaurantName: string;
  planNameAr: string;
  amount: number;
  billingCycle: "monthly" | "yearly";
  currency?: string;
}) {
  const cycleLabel = params.billingCycle === "yearly" ? "سنوي" : "شهري";
  const currency = params.currency || "EGP";

  const message = [
    `مرحبًا، عايز أشترك في Fluxio عن طريق فودافون كاش.`,
    `المطعم: ${params.restaurantName}`,
    `الباقة: ${params.planNameAr} (${cycleLabel})`,
    `المبلغ: ${params.amount} ${currency}`,
    `تم التحويل على الرقم: ${VODAFONE_CASH_NUMBER}`,
  ].join("\n");

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
