/** Valid, user-visible literal #label names that cannot act as regex rules. */
export const isLiteralLabelName = (value: string): boolean =>
  value.length > 0 && [...value].length <= 64 && /^[\p{L}\p{N}_-]+(?:\/[\p{L}\p{N}_-]+)*$/u.test(value);
