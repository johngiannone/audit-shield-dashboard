import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  calculateCost,
  parseJSONFromAIResponse,
} from "../ai.ts";

// ============================================================
// CALCULATE COST TESTS
// ============================================================

Deno.test("calculateCost returns correct cost for gemini-2.5-flash model", () => {
  // Model pricing: input: 0.075, output: 0.30 (per 1M tokens)
  const cost = calculateCost("google/gemini-2.5-flash", 1000000, 1000000);
  // Input: (1000000 / 1000000) * 0.075 = 0.075
  // Output: (1000000 / 1000000) * 0.30 = 0.30
  // Total: 0.375
  assertEquals(cost, 0.375);
});

Deno.test("calculateCost returns correct cost for gemini-2.5-pro model", () => {
  // Model pricing: input: 1.25, output: 5.00 (per 1M tokens)
  const cost = calculateCost("google/gemini-2.5-pro", 1000000, 1000000);
  // Input: (1000000 / 1000000) * 1.25 = 1.25
  // Output: (1000000 / 1000000) * 5.00 = 5.00
  // Total: 6.25
  assertEquals(cost, 6.25);
});

Deno.test("calculateCost handles partial token counts", () => {
  const cost = calculateCost("google/gemini-2.5-flash", 500000, 250000);
  // Input: (500000 / 1000000) * 0.075 = 0.0375
  // Output: (250000 / 1000000) * 0.30 = 0.075
  // Total: 0.1125
  assertEquals(cost, 0.1125);
});

Deno.test("calculateCost handles zero tokens", () => {
  const cost = calculateCost("google/gemini-2.5-flash", 0, 0);
  assertEquals(cost, 0);
});

Deno.test("calculateCost handles unknown model with fallback pricing", () => {
  const cost = calculateCost("unknown/model-xyz", 1000000, 1000000);
  // Should use default pricing: input: 0.075, output: 0.30
  assertEquals(cost, 0.375);
});

Deno.test("calculateCost handles large token counts", () => {
  const cost = calculateCost("google/gemini-2.5-flash", 10000000, 5000000);
  // Input: (10000000 / 1000000) * 0.075 = 0.75
  // Output: (5000000 / 1000000) * 0.30 = 1.50
  // Total: 2.25
  assertEquals(cost, 2.25);
});

Deno.test("calculateCost handles small fractional tokens", () => {
  const cost = calculateCost("google/gemini-2.5-flash", 100, 50);
  // Input: (100 / 1000000) * 0.075 = 0.0000075
  // Output: (50 / 1000000) * 0.30 = 0.000015
  // Total: 0.0000225
  assertEquals(cost, 0.0000225);
});

// ============================================================
// PARSE JSON FROM AI RESPONSE TESTS
// ============================================================

Deno.test("parseJSONFromAIResponse parses clean JSON object", () => {
  const response = '{"name": "John", "age": 30}';
  const result = parseJSONFromAIResponse(response);
  assertEquals(result, { name: "John", age: 30 });
});

Deno.test("parseJSONFromAIResponse parses clean JSON array", () => {
  const response = '[1, 2, 3, 4, 5]';
  const result = parseJSONFromAIResponse(response);
  assertEquals(result, [1, 2, 3, 4, 5]);
});

Deno.test("parseJSONFromAIResponse extracts JSON from markdown code block", () => {
  const response = '```json\n{"status": "success", "data": 42}\n```';
  const result = parseJSONFromAIResponse(response);
  assertEquals(result, { status: "success", data: 42 });
});

Deno.test("parseJSONFromAIResponse extracts JSON from text with extra context", () => {
  const response = 'Here is the response: {"key": "value", "count": 10} and some more text';
  const result = parseJSONFromAIResponse(response);
  assertEquals(result, { key: "value", count: 10 });
});

Deno.test("parseJSONFromAIResponse extracts array from markdown", () => {
  const response = '```\n[{"id": 1}, {"id": 2}]\n```';
  const result = parseJSONFromAIResponse(response);
  assertEquals(result, [{ id: 1 }, { id: 2 }]);
});

Deno.test("parseJSONFromAIResponse handles nested objects", () => {
  const response = '{"user": {"name": "Alice", "address": {"city": "NYC"}}, "active": true}';
  const result = parseJSONFromAIResponse(response);
  assertEquals(result, { user: { name: "Alice", address: { city: "NYC" } }, active: true });
});

Deno.test("parseJSONFromAIResponse handles mixed array of types", () => {
  const response = '[1, "string", true, null, {"key": "value"}]';
  const result = parseJSONFromAIResponse(response);
  assertEquals(result, [1, "string", true, null, { key: "value" }]);
});

Deno.test("parseJSONFromAIResponse handles JSON with special characters", () => {
  const response = '{"text": "Hello\\nWorld", "emoji": "🎉"}';
  const result = parseJSONFromAIResponse(response);
  assertEquals(result, { text: "Hello\nWorld", emoji: "🎉" });
});

Deno.test("parseJSONFromAIResponse handles JSON with escaped quotes", () => {
  const response = '{"quote": "He said \\"Hello\\""}';
  const result = parseJSONFromAIResponse(response);
  assertEquals(result, { quote: 'He said "Hello"' });
});

Deno.test("parseJSONFromAIResponse extracts from markdown with language specifier", () => {
  const response = '```typescript\nconst data = {"result": "success"};\n```';
  const result = parseJSONFromAIResponse(response);
  assertEquals(result, { result: "success" });
});

Deno.test("parseJSONFromAIResponse extracts JSON array from markdown", () => {
  const response = '```json\n[1, 2, 3]\n```';
  const result = parseJSONFromAIResponse(response);
  assertEquals(result, [1, 2, 3]);
});

Deno.test("parseJSONFromAIResponse handles whitespace around JSON", () => {
  const response = '   {"key": "value"}   ';
  const result = parseJSONFromAIResponse(response);
  assertEquals(result, { key: "value" });
});

Deno.test("parseJSONFromAIResponse handles multiple code blocks - uses first", () => {
  const response = '```{"first": 1}```\n```{"second": 2}```';
  const result = parseJSONFromAIResponse(response);
  // Should extract the first JSON object encountered
  assertEquals(result, { first: 1 });
});

Deno.test("parseJSONFromAIResponse handles JSON with numeric keys", () => {
  const response = '{"1": "a", "2": "b", "3": "c"}';
  const result = parseJSONFromAIResponse(response);
  assertEquals(result, { "1": "a", "2": "b", "3": "c" });
});

Deno.test("parseJSONFromAIResponse handles JSON with newlines inside strings", () => {
  const response = '{"multiline": "line1\\nline2\\nline3"}';
  const result = parseJSONFromAIResponse(response);
  assertEquals(result, { multiline: "line1\nline2\nline3" });
});

Deno.test("parseJSONFromAIResponse throws on invalid JSON without extraction option", () => {
  const response = 'This is plain text with no JSON';
  assertThrows(
    () => parseJSONFromAIResponse(response),
    Error,
    "Failed to parse AI response as JSON"
  );
});

Deno.test("parseJSONFromAIResponse throws on malformed JSON object", () => {
  const response = '{"incomplete": "object"';
  assertThrows(
    () => parseJSONFromAIResponse(response),
    Error,
    "Failed to parse AI response as JSON"
  );
});

Deno.test("parseJSONFromAIResponse throws on malformed JSON array", () => {
  const response = '[1, 2, 3';
  assertThrows(
    () => parseJSONFromAIResponse(response),
    Error,
    "Failed to parse AI response as JSON"
  );
});

Deno.test("parseJSONFromAIResponse throws on text that looks like JSON but isn't", () => {
  const response = '{this is not json}';
  assertThrows(
    () => parseJSONFromAIResponse(response),
    Error,
    "Failed to parse AI response as JSON"
  );
});

Deno.test("parseJSONFromAIResponse handles very large JSON object", () => {
  const largeObj: Record<string, number> = {};
  for (let i = 0; i < 1000; i++) {
    largeObj[`key_${i}`] = i;
  }
  const response = JSON.stringify(largeObj);
  const result = parseJSONFromAIResponse(response);
  assertEquals(Object.keys(result as Record<string, unknown>).length, 1000);
});

Deno.test("parseJSONFromAIResponse handles JSON with boolean and null values", () => {
  const response = '{"isActive": true, "isEmpty": false, "data": null}';
  const result = parseJSONFromAIResponse(response);
  assertEquals(result, { isActive: true, isEmpty: false, data: null });
});

Deno.test("parseJSONFromAIResponse handles empty object", () => {
  const response = '{}';
  const result = parseJSONFromAIResponse(response);
  assertEquals(result, {});
});

Deno.test("parseJSONFromAIResponse handles empty array", () => {
  const response = '[]';
  const result = parseJSONFromAIResponse(response);
  assertEquals(result, []);
});

Deno.test("parseJSONFromAIResponse handles JSON with scientific notation", () => {
  const response = '{"value": 1.23e-4}';
  const result = parseJSONFromAIResponse(response);
  assertEquals(result, { value: 0.000123 });
});

Deno.test("parseJSONFromAIResponse handles deeply nested structures", () => {
  const response = '{"a": {"b": {"c": {"d": {"e": "deep"}}}}}';
  const result = parseJSONFromAIResponse(response);
  const obj = result as Record<string, Record<string, Record<string, Record<string, Record<string, string>>>>>;
  assertEquals(obj.a.b.c.d.e, "deep");
});

Deno.test("parseJSONFromAIResponse extracts JSON from sentences", () => {
  const response = 'The result is {"success": true, "message": "Operation completed"}. Please note this.';
  const result = parseJSONFromAIResponse(response);
  assertEquals(result, { success: true, message: "Operation completed" });
});
