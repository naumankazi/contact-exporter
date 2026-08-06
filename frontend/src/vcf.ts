// Local-only vCard (VCF) generation. No network involved.
// Produces a standards-compliant vCard 3.0 file string.

export type SimpleContact = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phones: string[];
};

// Escape characters that carry special meaning in the vCard grammar.
function escapeValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function buildSingleVCard(contact: SimpleContact): string {
  const lines: string[] = [];
  lines.push("BEGIN:VCARD");
  lines.push("VERSION:3.0");

  const fullName = contact.name?.trim() || "No Name";
  lines.push(`FN:${escapeValue(fullName)}`);

  // Structured name: Family;Given;Additional;Prefix;Suffix
  const family = escapeValue(contact.lastName?.trim() || "");
  const given = escapeValue(contact.firstName?.trim() || "");
  lines.push(`N:${family};${given};;;`);

  contact.phones.forEach((raw) => {
    const phone = raw?.trim();
    if (phone) {
      lines.push(`TEL;TYPE=CELL:${escapeValue(phone)}`);
    }
  });

  lines.push("END:VCARD");
  return lines.join("\r\n");
}

// Concatenate multiple vCards into a single .vcf payload.
export function generateVCF(contacts: SimpleContact[]): string {
  return contacts.map(buildSingleVCard).join("\r\n") + "\r\n";
}

// Auto filename e.g. contacts_2026-06-15.vcf
export function buildFileName(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return `contacts_${stamp}.vcf`;
}
