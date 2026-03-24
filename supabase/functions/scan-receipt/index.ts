import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_SCAN_LIMIT = 2;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Authenticate the user server-side
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    // Server-side scan limit enforcement
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("receipts")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id)
      .gte("created_at", today.toISOString());

    if ((count || 0) >= DAILY_SCAN_LIMIT) {
      return new Response(
        JSON.stringify({ error: `Daily scan limit reached (${DAILY_SCAN_LIMIT}/day). Use manual bill entry instead.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) throw new Error("No image provided");

    const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    const resolvedMime = mimeType || "image/jpeg";
    if (!supportedTypes.includes(resolvedMime)) {
      return new Response(
        JSON.stringify({ error: "Unsupported file type. Please upload an image or PDF." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit payload size (~10MB base64)
    if (imageBase64.length > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "Image too large. Please use a smaller image." }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a receipt parser. Extract items from receipt images. Return ONLY valid JSON, no markdown.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${resolvedMime};base64,${imageBase64}`,
                  },
                },
                {
                  type: "text",
                  text: `Extract all items from this receipt. Return JSON with this exact structure:
{
  "items": [{"name": "Item Name", "price": 12.99}],
  "tax": 1.50,
  "tip": 0,
  "total": 14.49,
  "currency": "$"
}
Rules:
- price must be a number, not a string
- If tax is not visible, estimate it or set to 0
- If tip is not visible, set to 0
- total should be the receipt total
- currency should be the symbol used on the receipt
- Return ONLY the JSON object, no extra text`,
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "parse_receipt",
                description: "Parse receipt items, tax, tip, and total from a receipt image",
                parameters: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          price: { type: "number" },
                        },
                        required: ["name", "price"],
                        additionalProperties: false,
                      },
                    },
                    tax: { type: "number" },
                    tip: { type: "number" },
                    total: { type: "number" },
                    currency: { type: "string" },
                  },
                  required: ["items", "tax", "tip", "total", "currency"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "parse_receipt" },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let parsed;
    if (toolCall?.function?.arguments) {
      parsed = JSON.parse(toolCall.function.arguments);
    } else {
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse receipt data from AI response");
      parsed = JSON.parse(jsonMatch[0]);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-receipt error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
