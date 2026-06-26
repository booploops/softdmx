import assert from 'node:assert/strict';
import { createSampleGdtfBytes } from './fixtures/sample-gdtf.ts';
import { loadFixtureFromGdtf } from '../../frontend/src/fixture-library/gdtf/gdtf-to-fixture.ts';
import { exportFixtureGdtfBytes, fixtureToGdtfDescriptionXml } from '../../frontend/src/fixture-library/gdtf/fixture-to-gdtf.ts';
import { serializeFixtureYaml } from '../../frontend/src/fixture-library/fixture-serialize.ts';
import { loadFixtureYaml } from '../../frontend/src/fixture-library/fixture-yaml.ts';
import { parseGdtfArchive } from '../../frontend/src/fixture-library/gdtf/parse-gdtf.ts';

const fixture = loadFixtureFromGdtf(createSampleGdtfBytes(), 'sample-wash.gdtf');
const yaml = serializeFixtureYaml(fixture);
const reloaded = loadFixtureYaml(yaml);

assert.equal(reloaded.id, fixture.id);
assert.equal(reloaded.channels.length, fixture.channels.length);
assert.equal(reloaded.modes?.length, fixture.modes?.length);

const gdtfBytes = exportFixtureGdtfBytes(fixture);
assert.ok(gdtfBytes.length > 0);
const reparsed = parseGdtfArchive(gdtfBytes, 'roundtrip.gdtf');
assert.match(reparsed.descriptionXml, /Sample Wash/);

const generatedXml = fixtureToGdtfDescriptionXml(fixture);
assert.match(generatedXml, /ColorAdd_R/);

console.log('fixture-export tests passed');
