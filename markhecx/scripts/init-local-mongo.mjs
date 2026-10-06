import { MongoClient } from "mongodb";
// Explicitly local and isolated from a system MongoDB on its usual 27017 port.
const client = new MongoClient(
  "mongodb://127.0.0.1:27018/?directConnection=true",
  { serverSelectionTimeoutMS: 5000 },
);
try {
  await client.connect();
  const admin = client.db("admin");
  const hello = await admin.command({ hello: 1 });
  if (hello.setName && hello.setName !== "markhecx")
    throw Error(
      "The local server belongs to a different replica set; no changes made.",
    );
  if (!hello.setName)
    await admin.command({
      replSetInitiate: {
        _id: "markhecx",
        members: [{ _id: 0, host: "127.0.0.1:27018" }],
      },
    });
  for (let attempt = 0; attempt < 40; attempt++) {
    if ((await admin.command({ hello: 1 })).isWritablePrimary) {
      console.log("Local markhecx replica set is ready.");
      process.exitCode = 0;
      break;
    }
    if (attempt === 39)
      throw Error(
        "Replica set is still electing a primary. Check MongoDB logs.",
      );
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
} finally {
  await client.close();
}
