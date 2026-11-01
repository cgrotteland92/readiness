import { sql } from "../client.ts";
import { exerciseSeed, seedExercises } from "./exercises.ts";

const added = await seedExercises();
console.log(
  `Added ${added} exercises. ${exerciseSeed.length - added} already existed.`
);
await sql.end();
