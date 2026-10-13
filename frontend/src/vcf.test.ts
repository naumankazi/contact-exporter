import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildFileName, generateVCF, type SimpleContact } from "./vcf.ts";

describe("VCF export", () => {
  it("formats a contact as a vCard 3.0 entry", () => {
    const contact: SimpleContact = {
      id: "1",
      name: "Ada Lovelace",
      firstName: "Ada",
      lastName: "Lovelace",
      phones: ["+44 20 1234 5678"],
    };

    assert.equal(
      generateVCF([contact]),
      [
        "BEGIN:VCARD",
        "VERSION:3.0",
        "FN:Ada Lovelace",
        "N:Lovelace;Ada;;;",
        "TEL;TYPE=CELL:+44 20 1234 5678",
        "END:VCARD",
        "",
      ].join("\r\n"),
    );
  });

  it("escapes vCard special characters", () => {
    const contact: SimpleContact = {
      id: "2",
      name: "Jane, Doe; Esq.\nTeam\\",
      firstName: "Jane, Jr",
      lastName: "Doe; Sr",
      phones: ["+1 (555), 0100"],
    };

    const output = generateVCF([contact]);

    assert.ok(output.includes("FN:Jane\\, Doe\\; Esq.\\nTeam\\\\"));
    assert.ok(output.includes("N:Doe\\; Sr;Jane\\, Jr;;;"));
    assert.ok(output.includes("TEL;TYPE=CELL:+1 (555)\\, 0100"));
  });

  it("separates multiple contacts and terminates the file with CRLF", () => {
    const contacts: SimpleContact[] = [
      { id: "1", name: "Ada Lovelace", phones: ["111"] },
      { id: "2", name: "Grace Hopper", phones: ["222"] },
    ];
    const output = generateVCF(contacts);

    assert.equal(output.match(/BEGIN:VCARD/g)?.length, 2);
    assert.ok(output.includes("END:VCARD\r\nBEGIN:VCARD"));
    assert.ok(output.endsWith("\r\n"));
  });

  it("creates a date-based VCF filename", () => {
    assert.match(buildFileName(), /^contacts_\d{4}-\d{2}-\d{2}\.vcf$/);
  });
});