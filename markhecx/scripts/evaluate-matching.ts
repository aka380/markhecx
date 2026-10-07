import { evaluateSampleMatching } from "../lib/mark/marketplace/evaluation";

const results = evaluateSampleMatching();
console.log("HECX matching evaluation");
for (const result of results) {
  const top = result.ranking.slice(0, 4).map((entry) =>
    `${entry.creatorId}: ${entry.score ?? "unknown"}% (${entry.coverage}% coverage)`,
  );
  console.log(`\n${result.passed ? "PASS" : "FAIL"} ${result.caseId}`);
  console.log(`expected ${result.expectedCreatorId}; selected ${result.topCreatorId}`);
  console.log(top.join("\n"));
}

const passed = results.filter((result) => result.passed).length;
console.log(`\n${passed}/${results.length} scenarios selected the expected creator.`);
if (passed !== results.length) process.exitCode = 1;
