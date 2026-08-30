type JoiningType = "dual" | "right" | "causing" | "none";

const ARABIC_SCRIPT = /^\p{Script_Extensions=Arabic}$/u;
const LETTER = /^\p{Letter}$/u;

// Unicode 17.0 Joining_Type=Right_Joining characters in the Arabic blocks.
// See THIRD_PARTY_NOTICES.md. Keeping this data local avoids shipping a
// multi-megabyte Unicode database for a property that JavaScript regular
// expressions do not expose.
const RIGHT_JOINING = new Set(
  [
    0x0622, 0x0623, 0x0624, 0x0625, 0x0627, 0x0629, 0x062f, 0x0630, 0x0631, 0x0632, 0x0648, 0x0671,
    0x0672, 0x0673, 0x0675, 0x0676, 0x0677, 0x0688, 0x0689, 0x068a, 0x068b, 0x068c, 0x068d, 0x068e,
    0x068f, 0x0690, 0x0691, 0x0692, 0x0693, 0x0694, 0x0695, 0x0696, 0x0697, 0x0698, 0x0699, 0x06c0,
    0x06c3, 0x06c4, 0x06c5, 0x06c6, 0x06c7, 0x06c8, 0x06c9, 0x06ca, 0x06cb, 0x06cd, 0x06cf, 0x06d2,
    0x06d3, 0x06d5, 0x06ee, 0x06ef, 0x0759, 0x075a, 0x075b, 0x076b, 0x076c, 0x0771, 0x0773, 0x0774,
    0x0778, 0x0779, 0x0880, 0x0881, 0x0882, 0x088e, 0x08aa, 0x08ab, 0x08ac, 0x08ae, 0x08b1, 0x08b2,
    0x08b9,
  ].map((codePoint) => String.fromCodePoint(codePoint)),
);

// Joining_Type=Non_Joining characters that are letters in the Arabic script.
const NON_JOINING = new Set(
  [0x0621, 0x0674, 0x0861, 0x0866, 0x0887, 0x0888, 0x08ad].map((codePoint) =>
    String.fromCodePoint(codePoint),
  ),
);

function joiningType(character: string): JoiningType {
  if (character === "\u0640" || character === "\u200d") {
    return "causing";
  }
  if (
    character === "\u200c" ||
    !ARABIC_SCRIPT.test(character) ||
    !LETTER.test(character) ||
    NON_JOINING.has(character)
  ) {
    return "none";
  }
  return RIGHT_JOINING.has(character) ? "right" : "dual";
}

export function connectsToFollowing(character: string): boolean {
  const type = joiningType(character);
  return type === "dual" || type === "causing";
}

export function acceptsConnectionFromPrevious(character: string): boolean {
  return joiningType(character) !== "none";
}

export function isArabicJoiningCharacter(character: string): boolean {
  return joiningType(character) !== "none";
}
