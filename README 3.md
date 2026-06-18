# ephemeris — Licensing Decision

This document exists because Architecture Audit finding **EXT-DBT-2**
identified that Technical Bible B.10.5 stated a licensing *principle*
("resolve before launch, not deferred") without recording an actual
*decision*, and that the most obvious-looking npm package for this
purpose is a trap.

## The decision

This module implements **VSOP87** (Variations Séculaires des Orbites
Planétaires), the analytical planetary theory published by the Bureau
des Longitudes. VSOP87 is a set of published mathematical formulae, not
a specific codebase — it carries no license of its own, and clean-room
implementations of it are routinely published under permissive licenses
(MIT/BSD). **This module is, and must remain, an original implementation
of the published VSOP87 formulae**, not a vendored copy of any
third-party library.

## What this module explicitly does NOT do

It does not depend on, vendor, wrap, or link against **Swiss Ephemeris**
in any form. Swiss Ephemeris (the Astrodienst AG library) is
dual-licensed AGPL/commercial. AGPL's copyleft terms would require this
entire codebase to be open-sourced unless a commercial license is
purchased.

**A specific trap to document for future engineers:** searching the
public npm registry for "ephemeris" or "swiss ephemeris" surfaces several
packages whose names suggest they are the safe, permissively-licensed
choice but whose actual license is AGPL. Package *names* are not a
substitute for reading the actual `LICENSE` file of any dependency
before it is added to this repository.

## Accuracy tier and update cadence

- **Tier:** low-order truncated series. Empirically verified during
  implementation against a published 1990 ephemeris table: Sun, Saturn,
  Uranus, Neptune, and Pluto matched the reference's sign placement for a
  July 1990 test date; Mercury and Mars (the fastest, most eccentric
  inner-planet orbits, least well served by a short series) showed
  larger deviation. Treat Mercury/Mars sign placement near a sign
  boundary with appropriate caution.
- **A bug this verification step caught:** an earlier draft mixed two
  time-unit conventions (Julian millennia for the time variable, but
  centuries-based coefficients applied to it), producing Sun positions
  roughly 180° from correct for some dates. Fixed by standardizing every
  body function on Julian centuries — see the prominent warning at the
  top of `src/positions.ts`. Re-run `npm run verify:ephemeris` after any
  change to that file.
- **Valid range:** centuries around J2000.0 (the year 2000 epoch); more
  than sufficient for any living player's birth date and for transit
  calculations for the foreseeable lifetime of the product.
- **House system:** a simplified Placidus-family approximation (equal
  30° division from a correctly-derived Ascendant) when exact birth time
  and location are available; a "solar fallback" (Sun stands in for the
  Ascendant) when birth time is unknown, per Technical Bible B.2.2 — the
  onboarding flow never hard-blocks on an unknown birth time.

## Where this boundary lives in code

Every other part of the app calls into this module's exported functions
(`ephemeris/src/index.ts`) and never performs astronomical math itself.
`computeNatalChart` is the one deterministic entry point; nothing above
this module calls `eclipticLongitude`, `computeHouses`, or
`computeAspects` directly.
