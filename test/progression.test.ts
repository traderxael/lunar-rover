import { describe, expect, it } from "vitest";
import {
  calculateScore,
  createProgress,
  getSectorMedal,
  gradeMission,
  isMapUnlocked,
  recordMission,
  type LeaderboardEntry,
} from "@/game/Progression";

describe("gradeMission", () => {
  it("da S con energía alta y tiempo corto", () => {
    expect(gradeMission(80, 75)).toBe("S");
  });

  it("da A cuando falta energía para S", () => {
    expect(gradeMission(100, 60)).toBe("A");
  });

  it("da B cuando falta energía para A", () => {
    expect(gradeMission(140, 40)).toBe("B");
  });

  it("da C fuera de los umbrales", () => {
    expect(gradeMission(200, 20)).toBe("C");
  });
});

describe("calculateScore", () => {
  it("aplica bonus de grado y multiplicador de sector", () => {
    expect(calculateScore("tranquility", "S", 80, 75, 1)).toBe(2710);
    expect(calculateScore("tycho", "S", 80, 75, 1)).toBe(3388);
  });

  it("nunca devuelve un puntaje negativo", () => {
    expect(calculateScore("selenite", "C", 600, 0, 0)).toBe(0);
  });
});

describe("isMapUnlocked", () => {
  it("deja Tranquillitatis abierto y bloquea Tycho al inicio", () => {
    const progress = createProgress();
    expect(isMapUnlocked("tranquility", progress)).toBe(true);
    expect(isMapUnlocked("tycho", progress)).toBe(false);
  });
});

describe("recordMission", () => {
  it("registra la primera expedición y anuncia el desbloqueo de Tycho con grado A", () => {
    const report = recordMission("tranquility", "Mare Tranquillitatis", 100, 60, 1, 3);
    expect(report.grade).toBe("A");
    expect(report.rank).toBe(1);
    expect(report.record.completed).toBe(true);
    expect(report.newUnlock).toBe("tycho");
  });
});

describe("getSectorMedal", () => {
  it("otorga Órbita I al primer récord del sector", () => {
    const entry: LeaderboardEntry = {
      id: "test-entry",
      mapId: "tranquility",
      mapName: "Mare Tranquillitatis",
      grade: "A",
      score: 2710,
      elapsed: 100,
      energy: 60,
      optionalCollected: 1,
      optionalTotal: 3,
      createdAt: 1,
    };
    expect(getSectorMedal(entry, [entry])?.code).toBe("I");
  });
});