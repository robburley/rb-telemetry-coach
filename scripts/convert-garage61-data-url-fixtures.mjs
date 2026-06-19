#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const DATA_URL_PREFIX = "data:application/octet-stream;base64,";
const TDF_MAGIC_BYTES = [0xf0, 0x9f, 0x8f, 0x8e];

function parseArgs(argv) {
  const options = {
    check: false,
    fixtureDir: "example-data",
    outDir: null,
    selfTest: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--check") {
      options.check = true;
    } else if (arg === "--self-test") {
      options.selfTest = true;
    } else if (arg === "--fixture-dir") {
      options.fixtureDir = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === "--out-dir") {
      options.outDir = requireValue(argv, index, arg);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.check && !options.outDir && !options.selfTest) {
    options.check = true;
  }

  return options;
}

function requireValue(argv, index, arg) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${arg} requires a value`);
  }
  return value;
}

function printUsage() {
  console.log(`Usage: node scripts/convert-garage61-data-url-fixtures.mjs [options]

Options:
  --check                 Validate all example-data/*-tdf.txt fixtures
  --out-dir <dir>         Write decoded .tdf binary scratch files
  --fixture-dir <dir>     Read fixtures from another directory
  --self-test             Run built-in malformed data-url checks
  -h, --help              Show this help
`);
}

function decodeGarage61DataUrlFixture(text, fixtureName = "fixture") {
  const trimmed = text.trim();

  if (!trimmed.startsWith(DATA_URL_PREFIX)) {
    throw new Error(
      `${fixtureName}: missing required ${DATA_URL_PREFIX} prefix`,
    );
  }

  const payload = trimmed.slice(DATA_URL_PREFIX.length);
  if (!payload) {
    throw new Error(`${fixtureName}: base64 payload is empty`);
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(payload) || payload.length % 4 !== 0) {
    throw new Error(`${fixtureName}: base64 payload is malformed`);
  }

  const bytes = Buffer.from(payload, "base64");
  const reencoded = bytes.toString("base64");
  if (reencoded !== payload) {
    throw new Error(`${fixtureName}: base64 payload is not canonical`);
  }

  if (bytes.length < TDF_MAGIC_BYTES.length) {
    throw new Error(`${fixtureName}: decoded payload is too short`);
  }

  for (let index = 0; index < TDF_MAGIC_BYTES.length; index += 1) {
    if (bytes[index] !== TDF_MAGIC_BYTES[index]) {
      const actual = [...bytes.subarray(0, TDF_MAGIC_BYTES.length)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(" ");
      throw new Error(
        `${fixtureName}: decoded bytes start with ${actual}, expected f0 9f 8f 8e`,
      );
    }
  }

  return bytes;
}

async function listTdfTextFixtures(fixtureDir) {
  const entries = await readdir(fixtureDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith("-tdf.txt"))
    .sort();
}

async function validateFixtures(options) {
  const fixtureNames = await listTdfTextFixtures(options.fixtureDir);
  if (fixtureNames.length === 0) {
    throw new Error(`${options.fixtureDir}: no *-tdf.txt fixtures found`);
  }

  if (options.outDir) {
    await mkdir(options.outDir, { recursive: true });
  }

  const results = [];
  for (const fixtureName of fixtureNames) {
    const fixturePath = join(options.fixtureDir, fixtureName);
    const text = await readFile(fixturePath, "utf8");
    const bytes = decodeGarage61DataUrlFixture(text, fixtureName);

    if (options.outDir) {
      const outputName = fixtureName.replace(/\.txt$/u, ".tdf");
      await writeFile(join(options.outDir, outputName), bytes);
    }

    results.push({
      file: fixtureName,
      bytes: bytes.length,
    });
  }

  return results;
}

function runSelfTest() {
  const cases = [
    ["missing-prefix", "not-a-data-url"],
    ["empty-payload", DATA_URL_PREFIX],
    ["bad-magic", `${DATA_URL_PREFIX}${Buffer.from("nope").toString("base64")}`],
  ];

  for (const [name, text] of cases) {
    try {
      decodeGarage61DataUrlFixture(text, name);
      throw new Error(`${name}: expected validation failure`);
    } catch (error) {
      if (error.message === `${name}: expected validation failure`) {
        throw error;
      }
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.selfTest) {
    runSelfTest();
    console.log("self-test: ok");
  }

  if (options.check || options.outDir) {
    const results = await validateFixtures(options);
    for (const result of results) {
      const output = options.outDir
        ? ` -> ${join(options.outDir, basename(result.file, ".txt"))}.tdf`
        : "";
      console.log(`${result.file}: ok (${result.bytes} bytes)${output}`);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
