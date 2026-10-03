import { getMedicinePricing, applyDiscount, getStripDiscountPercent } from "../src/lib/medicinePricing";

// Temporary test implementation if importing before file update
function testCases() {
  const samples = [
    {
      label: "1. Napa 500 (Allopathic standard)",
      product: { name: "Napa 500 mg tablets", price: 12, original_price: 1.2, price_unit: "strip", specification: "Pack Size: 51 x 10: ৳ 612.00" }
    },
    {
      label: "2. Cef-3 200 mg capsule (null original_price)",
      product: { name: "Cef-3 200 mg capsule", price: 350, original_price: null, price_unit: "strip", specification: "Pack Size: 2 x 7: ৳ 700.00" }
    },
    {
      label: "3. Valentino (active+inert oral contraceptive)",
      product: { name: "Valentino 3 mg+0.03 mg tablets", price: 456, original_price: null, price_unit: "(24 active+4 inert) tablet", specification: null }
    },
    {
      label: "4. Agerd Capsule (Hamdard explicit strip & unit price)",
      product: { name: "Agerd Capsule", price: 5, original_price: 5, price_unit: "piece", specification: "Unit Price: ৳ 5.00 (5 x 10: ৳ 250.00) Strip Price: ৳ 50.00" }
    },
    {
      label: "5. Alisa Tablet (Hamdard explicit strip & unit price)",
      product: { name: "Alisa Tablet", price: 3, original_price: 3, price_unit: "piece", specification: "Unit Price: ৳ 3.00 (5 x 10: ৳ 150.00) Strip Price: ৳ 30.00" }
    },
    {
      label: "6. Carmina Tablet (Hamdard 60's pack bottle)",
      product: { name: "Carmina Tablet", price: 2.17, original_price: 2.17, price_unit: "piece", specification: "Unit Price: ৳ 2.17 (60's pack: ৳ 130.00)" }
    },
    {
      label: "7. Sualin Tablet (Hamdard 50's container)",
      product: { name: "Sualin Tablet", price: 2.5, original_price: 2.5, price_unit: "piece", specification: "Unit Price: ৳ 2.50 (50's container: ৳ 125.00)" }
    },
    {
      label: "8. Surobin Tablet (Hamdard without 'Strip Price:' string)",
      product: { name: "Surobin Tablet", price: 4, original_price: 4, price_unit: "piece", specification: "Unit Price: ৳ 4.00 (5 x 10: ৳ 200.00)" }
    },
    {
      label: "9. Hamdard Basak Syrup (Syrup - NOT tablet/strip)",
      product: { name: "Hamdard Basak Syrup", price: 75, original_price: 75, price_unit: "piece", specification: "100 ml bottle: ৳ 75.00 | 225 ml bottle: ৳ 130.00" }
    },
    {
      label: "10. Dermasol Ointment (Ointment - NOT tablet/strip)",
      product: { name: "Dermasol 0.05% ointment", price: 35, original_price: 35, price_unit: "tube", specification: "10 gm tube: ৳ 35.00" }
    },
  ];

  for (const s of samples) {
    const res = getMedicinePricing(s.product);
    console.log("=========================================");
    console.log(s.label);
    console.log("Input:", s.product.name, "| price:", s.product.price, "| orig:", s.product.original_price, "| spec:", s.product.specification);
    console.log("Parsed:", res);
  }
}

testCases();
