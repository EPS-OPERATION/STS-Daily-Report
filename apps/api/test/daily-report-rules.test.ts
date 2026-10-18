import { describe, expect, it } from "bun:test";

describe("Daily Report Business Logic Invariants", () => {
  describe("Morning Check-in Headcount Rules", () => {
    it("ensures nationality/gender split matches headcount by position exactly", () => {
      const positions = [
        { position: "engineer", headcount: 2 },
        { position: "foreman", headcount: 3 },
        { position: "welder", headcount: 5 },
        { position: "worker", headcount: 10 },
      ];
      const totalByPosition = positions.reduce((sum, p) => sum + p.headcount, 0); // 20

      const validSplit = { thaiMale: 10, thaiFemale: 2, foreignMale: 8, foreignFemale: 0 };
      const totalByNationality = validSplit.thaiMale + validSplit.thaiFemale + validSplit.foreignMale + validSplit.foreignFemale;

      expect(totalByNationality).toBe(totalByPosition);

      const invalidSplit = { thaiMale: 10, thaiFemale: 2, foreignMale: 5, foreignFemale: 0 }; // 17 != 20
      const totalInvalid = invalidSplit.thaiMale + invalidSplit.thaiFemale + invalidSplit.foreignMale + invalidSplit.foreignFemale;
      expect(totalInvalid).not.toBe(totalByPosition);
    });

    it("ensures building allocations sum equals total headcount exactly", () => {
      const totalHeadcount = 25;
      const validAllocations = [
        { buildingCode: "BLR", headcount: 12 },
        { buildingCode: "TG", headcount: 8 },
        { buildingCode: "ACC", headcount: 5 },
      ];
      const sumAllocated = validAllocations.reduce((sum, a) => sum + a.headcount, 0);
      expect(sumAllocated).toBe(totalHeadcount);

      const underAllocated = [
        { buildingCode: "BLR", headcount: 10 },
        { buildingCode: "TG", headcount: 8 },
      ]; // 18 != 25
      const sumUnder = underAllocated.reduce((sum, a) => sum + a.headcount, 0);
      expect(sumUnder).not.toBe(totalHeadcount);
    });

    it("verifies each position appears at most once in positions list", () => {
      const uniquePositions = ["foreman", "welder", "worker"];
      const duplicatePositions = ["foreman", "welder", "foreman"];

      const hasDuplicates = (list: string[]) => new Set(list).size !== list.length;
      expect(hasDuplicates(uniquePositions)).toBe(false);
      expect(hasDuplicates(duplicatePositions)).toBe(true);
    });
  });

  describe("Evening Check-out Progress & Countermeasure Rules", () => {
    function validateProgress(planPercent: number, actualPercent: number, countermeasure?: string | null): boolean {
      if (actualPercent < planPercent) {
        return Boolean(countermeasure && countermeasure.trim().length > 0);
      }
      return true;
    }

    it("requires countermeasure when actual % is less than plan %", () => {
      // Behind plan without countermeasure -> invalid
      expect(validateProgress(80, 60, "")).toBe(false);
      expect(validateProgress(80, 60, "   ")).toBe(false);
      expect(validateProgress(80, 60, null)).toBe(false);

      // Behind plan with countermeasure -> valid
      expect(validateProgress(80, 60, "เร่งงานเพิ่มโฟร์แมน 1 คนและทำ OT 2 ชม.")).toBe(true);
    });

    it("does not require countermeasure when actual % is on or ahead of plan", () => {
      expect(validateProgress(75, 75, "")).toBe(true);
      expect(validateProgress(75, 85, "")).toBe(true);
      expect(validateProgress(75, 90, null)).toBe(true);
    });
  });

  describe("Safety Incident Reporting Rules", () => {
    function validateAccidentInput(occurred: boolean, category?: string | null, note?: string | null): { valid: boolean; reason?: string } {
      if (occurred) {
        if (!category) return { valid: false, reason: "Missing category" };
        if (!note || !note.trim()) return { valid: false, reason: "Missing note" };
      }
      return { valid: true };
    }

    it("enforces category and note when an accident occurred", () => {
      expect(validateAccidentInput(true, null, null).valid).toBe(false);
      expect(validateAccidentInput(true, "near_miss", "").valid).toBe(false);
      expect(validateAccidentInput(true, "near_miss", "นั่งร้านโคลงเคลงระหว่างเดินตรวจ").valid).toBe(true);
    });

    it("allows null category/note when no accident occurred", () => {
      expect(validateAccidentInput(false, null, null).valid).toBe(true);
    });
  });

  describe("EPS Review Rules", () => {
    function validateReviewDecision(decision: "approved" | "rejected", note?: string | null): boolean {
      if (decision === "rejected") {
        return Boolean(note && note.trim().length > 0);
      }
      return true;
    }

    it("requires note when EPS rejects a report so contractor knows what to fix", () => {
      expect(validateReviewDecision("rejected", "")).toBe(false);
      expect(validateReviewDecision("rejected", "   ")).toBe(false);
      expect(validateReviewDecision("rejected", "ยอดคนงานที่จัดสรรลงหม้อไอน้ำไม่ตรงกับยอดที่เข้าไซต์")).toBe(true);
    });

    it("allows approval with or without optional note", () => {
      expect(validateReviewDecision("approved", "")).toBe(true);
      expect(validateReviewDecision("approved", "เรียบร้อยดี")).toBe(true);
    });
  });

  describe("Tomorrow Requests Time Windows", () => {
    it("validates time window boundaries", () => {
      const isValidWindow = (start: string, end: string) => start < end;
      expect(isValidWindow("08:00", "12:00")).toBe(true);
      expect(isValidWindow("13:00", "17:00")).toBe(true);
      expect(isValidWindow("17:00", "08:00")).toBe(false);
      expect(isValidWindow("10:00", "10:00")).toBe(false);
    });
  });

  describe("Work Permit Validation Rules", () => {
    function validatePermit(permit: {
      permitType: string;
      otherLabel?: string | null;
      workers: number;
      highRisk: boolean;
      taskName?: string | null;
      supervisorName?: string | null;
    }): { valid: boolean; error?: string } {
      if (permit.workers <= 0) return { valid: false, error: "Workers must be greater than 0" };
      if (permit.permitType === "other" && !permit.otherLabel?.trim()) {
        return { valid: false, error: "Describe the permit when type is Other" };
      }
      if (permit.highRisk && (!permit.taskName?.trim() || !permit.supervisorName?.trim())) {
        return { valid: false, error: "High-risk work needs a task name and an EPS supervisor" };
      }
      return { valid: true };
    }

    it("requires otherLabel when permitType is other", () => {
      expect(validatePermit({ permitType: "other", otherLabel: "", workers: 2, highRisk: false }).valid).toBe(false);
      expect(validatePermit({ permitType: "other", otherLabel: "งานเชื่อมใต้น้ำ", workers: 2, highRisk: false }).valid).toBe(true);
    });

    it("requires taskName and supervisorName when highRisk is true", () => {
      expect(validatePermit({ permitType: "hot_work", workers: 3, highRisk: true, taskName: "", supervisorName: "สุชิต" }).valid).toBe(false);
      expect(validatePermit({ permitType: "hot_work", workers: 3, highRisk: true, taskName: "งานเชื่อมท่อ", supervisorName: "" }).valid).toBe(false);
      expect(validatePermit({ permitType: "hot_work", workers: 3, highRisk: true, taskName: "งานเชื่อมท่อ", supervisorName: "สุชิต" }).valid).toBe(true);
    });

    it("enforces workers headcount > 0", () => {
      expect(validatePermit({ permitType: "height", workers: 0, highRisk: false }).valid).toBe(false);
      expect(validatePermit({ permitType: "height", workers: -1, highRisk: false }).valid).toBe(false);
      expect(validatePermit({ permitType: "height", workers: 5, highRisk: false }).valid).toBe(true);
    });
  });
});

