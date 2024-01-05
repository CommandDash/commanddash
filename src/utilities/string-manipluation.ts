export function removeSpacesAndNewlines(input: string): string {
  // Use regular expressions to replace spaces and newlines with an empty string
  const result = input.replace(/\s+/g, " ");

  return result;
}
