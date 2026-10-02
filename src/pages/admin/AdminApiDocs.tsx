import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { BookOpen, FileDown, ExternalLink } from "lucide-react";
import BackButton from "@/components/BackButton";

const BASE = "https://rbkhznaontwdhczxznlp.supabase.co/functions/v1";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h3 className="text-lg font-semibold">{title}</h3>
    {children}
  </div>
);

const CodeBlock = ({ children }: { children: string }) => (
  <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap border">
    <code>{children}</code>
  </pre>
);

const EndpointCard = ({ method, path, desc, params, body, response, curl }: any) => (
  <Card className="border">
    <CardHeader className="pb-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={method === "GET" ? "default" : "secondary"} className="font-mono text-xs">{method}</Badge>
        <code className="text-sm font-semibold">{path}</code>
      </div>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </CardHeader>
    <CardContent className="space-y-3 text-sm">
      {params && (
        <div>
          <p className="font-medium mb-1">Parameters:</p>
          <div className="bg-muted rounded p-2 text-xs space-y-1">
            {params.map((p: any, i: number) => (
              <div key={i}><code className="text-primary">{p.name}</code> <span className="text-muted-foreground">({p.type})</span> — {p.desc}</div>
            ))}
          </div>
        </div>
      )}
      {body && (
        <div>
          <p className="font-medium mb-1">Request Body:</p>
          <CodeBlock>{body}</CodeBlock>
        </div>
      )}
      {response && (
        <div>
          <p className="font-medium mb-1">Response:</p>
          <CodeBlock>{response}</CodeBlock>
        </div>
      )}
      {curl && (
        <div>
          <p className="font-medium mb-1">cURL Example:</p>
          <CodeBlock>{curl}</CodeBlock>
        </div>
      )}
    </CardContent>
  </Card>
);

const downloadPdf = () => {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Qweek BD API Documentation</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px;font-size:13px;color:#333}
h1{color:#1a1a1a;border-bottom:2px solid #333;padding-bottom:8px}h2{color:#444;margin-top:30px}
h3{margin-top:20px}pre{background:#f5f5f5;padding:12px;border-radius:6px;font-size:11px;overflow-x:auto;border:1px solid #ddd}
code{font-family:'Fira Code',monospace;font-size:11px}.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;color:white}
.get{background:#22c55e}.post{background:#3b82f6}table{width:100%;border-collapse:collapse;margin:10px 0}
th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:11px}th{background:#f5f5f5}
.section{page-break-inside:avoid;margin-bottom:30px}
@media print{body{padding:20px}}</style></head><body>
<h1>🛒 Qweek BD — API Documentation</h1>
<p>Base URL: <code>${BASE}/public-api/</code></p>
<p>Cart API: <code>${BASE}/create-external-cart</code></p>
<p>সকল রিকুয়েস্টে <code>x-api-key</code> হেডার আবশ্যক।</p>

<h2>📦 Data Endpoints (GET)</h2>

<div class="section"><h3><span class="badge get">GET</span> /categories</h3>
<p>সকল ক্যাটেগরি রিটার্ন করে।</p>
<pre>curl -H "x-api-key: YOUR_KEY" ${BASE}/public-api/categories</pre></div>

<div class="section"><h3><span class="badge get">GET</span> /subcategories?category=SLUG</h3>
<p>সাবক্যাটেগরি। category parameter ঐচ্ছিক।</p></div>

<div class="section"><h3><span class="badge get">GET</span> /brands</h3>
<p>সকল অ্যাক্টিভ ব্র্যান্ড।</p></div>

<div class="section"><h3><span class="badge get">GET</span> /products?category=X&subcategory=Y&brand_id=Z&search=Q&page=1&limit=50</h3>
<p>প্রোডাক্ট লিস্ট। সব parameter ঐচ্ছিক। Max limit: 100।</p></div>

<div class="section"><h3><span class="badge get">GET</span> /product?slug=X or ?id=UUID</h3>
<p>সিঙ্গেল প্রোডাক্ট ডিটেইল সহ images ও variants।</p></div>

<h2>🛒 Cart & Checkout</h2>
<div class="section"><h3><span class="badge post">POST</span> /create-external-cart</h3>
<p>External কার্ট তৈরি করে checkout URL রিটার্ন করে।</p>
<pre>curl -X POST -H "x-api-key: YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"items":[{"product_id":"UUID","quantity":2}]}' \\
  ${BASE}/create-external-cart</pre>
<p>Response এ checkout_url পাবেন। ইউজারকে সেই URL এ redirect করুন।</p>
<p>Checkout QweekBD এর ফ্লো ব্যবহার করবে কিন্তু আপনার সাইট থেকে redirect হবে।</p></div>

<h2>📋 Order Tracking</h2>
<div class="section"><h3><span class="badge get">GET</span> /order-status?order_id=UUID or ?order_number=12345</h3>
<p>অর্ডার স্ট্যাটাস, আইটেম ও ট্র্যাকিং ইনফো।</p>
<pre>curl -H "x-api-key: YOUR_KEY" "${BASE}/public-api/order-status?order_number=12345"</pre></div>

<h2>💬 Messaging</h2>
<div class="section"><h3><span class="badge post">POST</span> /send-message</h3>
<p>QweekBD এডমিনকে মেসেজ পাঠান।</p>
<pre>curl -X POST -H "x-api-key: YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Order #123 নিয়ে জানতে চাই","order_id":"UUID","sender_name":"Partner X"}' \\
  ${BASE}/public-api/send-message</pre></div>

<div class="section"><h3><span class="badge get">GET</span> /get-messages</h3>
<p>এডমিন থেকে আসা রিপ্লাই দেখুন।</p></div>

<h2>🔄 সম্পূর্ণ ফ্লো</h2>
<table><tr><th>ধাপ</th><th>বিবরণ</th></tr>
<tr><td>1</td><td>API Key সংগ্রহ করুন QweekBD এডমিন থেকে</td></tr>
<tr><td>2</td><td><code>/products</code> দিয়ে প্রোডাক্ট sync করুন (রিয়েল টাইম)</td></tr>
<tr><td>3</td><td><code>/categories</code>, <code>/subcategories</code> দিয়ে ক্যাটেগরি sync করুন</td></tr>
<tr><td>4</td><td>কাস্টমার কার্টে প্রোডাক্ট যোগ করলে <code>/create-external-cart</code> কল করুন</td></tr>
<tr><td>5</td><td>checkout_url এ ইউজারকে redirect করুন</td></tr>
<tr><td>6</td><td>অর্ডার QweekBD এডমিন প্যানেলে জমা হবে</td></tr>
<tr><td>7</td><td><code>/order-status</code> দিয়ে আপনার ড্যাশবোর্ডে অর্ডার ট্র্যাক করুন</td></tr>
<tr><td>8</td><td><code>/send-message</code> দিয়ে QweekBD এডমিনকে মেসেজ করুন</td></tr>
</table>

<h2>⚠️ Error Codes</h2>
<table><tr><th>Code</th><th>মানে</th></tr>
<tr><td>401</td><td>API key মিসিং</td></tr>
<tr><td>403</td><td>API key ভুল বা নিষ্ক্রিয়</td></tr>
<tr><td>400</td><td>প্যারামিটার ভুল</td></tr>
<tr><td>404</td><td>Endpoint বা ডেটা পাওয়া যায়নি</td></tr>
<tr><td>500</td><td>সার্ভার এরর</td></tr></table>

<h2>📌 গুরুত্বপূর্ণ নোট</h2>
<ul>
<li>সকল ডেটা রিয়েল টাইমে sync হয় — ক্যাশ করবেন না দীর্ঘ সময়ের জন্য</li>
<li>Rate limit: প্রতি মিনিটে ৬০ রিকুয়েস্ট</li>
<li>কার্ট ২৪ ঘণ্টা পর expire হয়</li>
<li>সর্বোচ্চ ৫০টি আইটেম প্রতি কার্টে</li>
</ul>
</body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) setTimeout(() => { w.print(); URL.revokeObjectURL(url); }, 800);
};

const AdminApiDocs = () => {
  return (
    <div className="p-3 sm:p-6 space-y-6">
      <BackButton className="mb-1" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">API Documentation</h1>
        </div>
        <Button variant="outline" onClick={downloadPdf}>
          <FileDown className="h-4 w-4 mr-2" /> Download PDF
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-2">
          <p className="text-sm"><strong>Base URL (Data):</strong> <code className="bg-muted px-2 py-1 rounded text-xs">{BASE}/public-api/</code></p>
          <p className="text-sm"><strong>Cart API:</strong> <code className="bg-muted px-2 py-1 rounded text-xs">{BASE}/create-external-cart</code></p>
          <p className="text-sm text-muted-foreground">সকল রিকুয়েস্টে <code className="bg-muted px-1 rounded">x-api-key: YOUR_API_KEY</code> হেডার আবশ্যক।</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="data" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="data">📦 Data</TabsTrigger>
          <TabsTrigger value="cart">🛒 Cart & Checkout</TabsTrigger>
          <TabsTrigger value="orders">📋 Order Tracking</TabsTrigger>
          <TabsTrigger value="messaging">💬 Messaging</TabsTrigger>
          <TabsTrigger value="flow">🔄 Full Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="space-y-4">
          <EndpointCard method="GET" path="/categories" desc="সকল ক্যাটেগরি (id, name, slug, icon_url, sort_order)"
            response={`{ "success": true, "data": [{ "id": "uuid", "name": "Electronics", "slug": "electronics", "icon_url": "...", "sort_order": 1 }] }`}
            curl={`curl -H "x-api-key: YOUR_KEY" \\\n  ${BASE}/public-api/categories`} />

          <EndpointCard method="GET" path="/subcategories" desc="সাবক্যাটেগরি। category slug দিয়ে ফিল্টার করা যায়।"
            params={[{ name: "category", type: "string, optional", desc: "Parent category slug" }]}
            curl={`curl -H "x-api-key: YOUR_KEY" \\\n  "${BASE}/public-api/subcategories?category=electronics"`} />

          <EndpointCard method="GET" path="/brands" desc="সকল অ্যাক্টিভ ও অ্যাপ্রুভড ব্র্যান্ড।"
            curl={`curl -H "x-api-key: YOUR_KEY" \\\n  ${BASE}/public-api/brands`} />

          <EndpointCard method="GET" path="/products" desc="প্রোডাক্ট লিস্ট, ফিল্টার ও পেজিনেশন সহ।"
            params={[
              { name: "category", type: "string, optional", desc: "Category slug" },
              { name: "subcategory", type: "string, optional", desc: "Subcategory slug" },
              { name: "brand_id", type: "uuid, optional", desc: "Brand UUID" },
              { name: "search", type: "string, optional", desc: "নাম দিয়ে সার্চ" },
              { name: "page", type: "number, default: 1", desc: "পেজ নম্বর" },
              { name: "limit", type: "number, default: 50, max: 100", desc: "প্রতি পেজে আইটেম" },
            ]}
            curl={`curl -H "x-api-key: YOUR_KEY" \\\n  "${BASE}/public-api/products?category=electronics&page=1&limit=20"`} />

          <EndpointCard method="GET" path="/product" desc="সিঙ্গেল প্রোডাক্ট — images ও variants সহ।"
            params={[
              { name: "slug", type: "string", desc: "Product slug (slug অথবা id দিন)" },
              { name: "id", type: "uuid", desc: "Product UUID" },
            ]}
            response={`{ "success": true, "data": { "id": "uuid", "name": "...", "price": 1500, "images": [...], "variants": [...] } }`}
            curl={`curl -H "x-api-key: YOUR_KEY" \\\n  "${BASE}/public-api/product?slug=my-product"`} />
        </TabsContent>

        <TabsContent value="cart" className="space-y-4">
          <Card className="bg-muted/50 border-primary/20">
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold text-primary">🔄 Cart Sync & Checkout Flow</h3>
              <ol className="text-sm space-y-2 list-decimal pl-5">
                <li>আপনার সাইটে কাস্টমার প্রোডাক্ট কার্টে যোগ করবে</li>
                <li>Checkout বাটনে ক্লিক করলে <code className="bg-muted px-1 rounded">/create-external-cart</code> কল করুন</li>
                <li>API response এ <code>checkout_url</code> পাবেন</li>
                <li>কাস্টমারকে সেই URL এ redirect করুন</li>
                <li>QweekBD এর checkout ফ্লো চলবে (কিন্তু আপনার সাইট থেকে এসেছে সেটা ট্র্যাক হবে)</li>
                <li>অর্ডার সম্পন্ন হলে QweekBD এডমিন প্যানেলে জমা হবে</li>
              </ol>
            </CardContent>
          </Card>

          <EndpointCard method="POST" path="/create-external-cart" desc="External কার্ট তৈরি করে checkout URL রিটার্ন করে।"
            body={`{
  "items": [
    { "product_id": "uuid-1", "quantity": 2 },
    { "product_id": "uuid-2", "quantity": 1 }
  ]
}`}
            response={`{
  "success": true,
  "data": {
    "checkout_url": "https://qweekbd.lovable.app/cart/TOKEN",
    "cart_token": "TOKEN",
    "items": [...],
    "expires_in": "24 hours"
  }
}`}
            curl={`curl -X POST \\\n  -H "x-api-key: YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"items":[{"product_id":"uuid","quantity":2}]}' \\\n  ${BASE}/create-external-cart`} />

          <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="pt-4 text-sm space-y-1">
              <p className="font-medium text-orange-700">⚠️ গুরুত্বপূর্ণ:</p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>কার্ট ২৪ ঘণ্টা পর expire হয়</li>
                <li>সর্বোচ্চ ৫০টি আইটেম প্রতি কার্টে</li>
                <li>প্রতি আইটেমে quantity ১-১০০</li>
                <li>প্রোডাক্ট অ্যাক্টিভ ও স্টকে থাকতে হবে</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <EndpointCard method="GET" path="/order-status" desc="অর্ডার স্ট্যাটাস ও ডিটেইলস দেখুন। আপনার ড্যাশবোর্ডে শো করতে পারেন।"
            params={[
              { name: "order_id", type: "uuid", desc: "Order UUID (order_id অথবা order_number দিন)" },
              { name: "order_number", type: "number", desc: "Order number" },
            ]}
            response={`{
  "success": true,
  "data": {
    "id": "uuid",
    "order_number": 12345,
    "status": "pending | confirmed | processing | shipped | delivered | cancelled",
    "total": 2500,
    "payment_method": "cod",
    "customer_name": "...",
    "steadfast_tracking_code": "...",
    "items": [{ "product_id": "uuid", "quantity": 2, "price": 1000 }]
  }
}`}
            curl={`curl -H "x-api-key: YOUR_KEY" \\\n  "${BASE}/public-api/order-status?order_number=12345"`} />

          <Card className="bg-muted/50">
            <CardContent className="pt-6 text-sm space-y-2">
              <h4 className="font-semibold">💡 আপনার ড্যাশবোর্ডে Order Tracking</h4>
              <p className="text-muted-foreground">
                checkout_url থেকে অর্ডার সম্পন্ন হলে, আপনি order_number বা order_id সংরক্ষণ করুন। 
                তারপর নিয়মিত <code>/order-status</code> poll করে আপনার ড্যাশবোর্ডে অর্ডার আইডি ও স্ট্যাটাস আপডেট দেখাতে পারেন।
              </p>
              <p className="text-muted-foreground">
                <strong>Recommended polling interval:</strong> প্রতি ৫ মিনিটে একবার।
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messaging" className="space-y-4">
          <EndpointCard method="POST" path="/send-message" desc="QweekBD এডমিনকে মেসেজ পাঠান। মেসেজ এডমিন প্যানেলের নোটিফিকেশনে আসবে।"
            body={`{
  "message": "Order #12345 নিয়ে জানতে চাই",
  "order_id": "uuid (optional)",
  "sender_name": "Partner X (optional)"
}`}
            response={`{ "success": true, "data": { "message_id": "uuid", "status": "sent" } }`}
            curl={`curl -X POST \\\n  -H "x-api-key: YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"message":"Hello, order update chai"}' \\\n  ${BASE}/public-api/send-message`} />

          <EndpointCard method="GET" path="/get-messages" desc="এডমিন থেকে আসা রিপ্লাই দেখুন।"
            response={`{ "success": true, "data": [{ "id": "uuid", "title": "...", "body": "...", "created_at": "..." }] }`}
            curl={`curl -H "x-api-key: YOUR_KEY" \\\n  ${BASE}/public-api/get-messages`} />
        </TabsContent>

        <TabsContent value="flow" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">🔄 সম্পূর্ণ ইন্টিগ্রেশন ফ্লো</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                {[
                  { step: "১", title: "API Key সংগ্রহ", desc: "QweekBD এডমিন থেকে API Key নিন।" },
                  { step: "২", title: "ডেটা Sync", desc: "/products, /categories, /subcategories দিয়ে রিয়েল টাইমে ডেটা fetch করুন। আপনার সাইটে হুবহু QweekBD এর মতো প্রোডাক্ট দেখাবে।" },
                  { step: "৩", title: "কার্ট তৈরি", desc: "কাস্টমার Checkout বাটনে ক্লিক করলে /create-external-cart কল করুন। আপনার কার্ট ও QweekBD কার্ট sync হবে।" },
                  { step: "৪", title: "Checkout Redirect", desc: "checkout_url এ কাস্টমারকে redirect করুন। QweekBD এর checkout ফ্লো চলবে কিন্তু থিম আপনার সাইটের থাকবে না — QweekBD এর checkout page ব্যবহার হবে।" },
                  { step: "৫", title: "অর্ডার ম্যানেজমেন্ট", desc: "অর্ডার QweekBD এডমিন প্যানেলে জমা হবে ও প্রসেস হবে।" },
                  { step: "৬", title: "Order Tracking", desc: "/order-status দিয়ে আপনার ড্যাশবোর্ডে অর্ডার আইডি ও স্ট্যাটাস আপডেট শো করুন।" },
                  { step: "৭", title: "Messaging", desc: "/send-message দিয়ে QweekBD এডমিনকে মেসেজ করুন, /get-messages দিয়ে রিপ্লাই দেখুন।" },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6 text-sm space-y-2">
              <h4 className="font-semibold">⚠️ Error Codes</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><Badge variant="outline">401</Badge> API key মিসিং</div>
                <div><Badge variant="outline">403</Badge> API key ভুল/নিষ্ক্রিয়</div>
                <div><Badge variant="outline">400</Badge> প্যারামিটার ভুল</div>
                <div><Badge variant="outline">404</Badge> ডেটা পাওয়া যায়নি</div>
                <div><Badge variant="outline">405</Badge> Method not allowed</div>
                <div><Badge variant="outline">500</Badge> সার্ভার এরর</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-sm space-y-1">
              <h4 className="font-semibold">📌 Rate Limits & Notes</h4>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>প্রতি মিনিটে সর্বোচ্চ ৬০ রিকুয়েস্ট</li>
                <li>Products endpoint এ max 100 items per page</li>
                <li>সব ডেটা রিয়েল টাইমে sync — দীর্ঘ সময় ক্যাশ করবেন না</li>
                <li>একটি API Key দিয়ে সকল endpoint অ্যাক্সেস করা যায়</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminApiDocs;
