
import { supabase } from "./lib/supabase.js";

export async function testSupabaseConnection() {
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .limit(1);

  if (error) {
    console.error("Supabase test failed:", error.message);
    return;
  }

  console.log("Supabase connection successful:", data);
}
testSupabaseConnection();