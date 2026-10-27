/**
 * GER4K source-transparency components barrel.
 *
 * {@link SourceStatusTag} renders the `sourceStatus` axis only. The simulation
 * axis (`isSimulated`) is shown separately with quiet honesty chips
 * (`HonestyChip` in `@/components/transit/TransitBits`), so the two axes are
 * never collapsed into one label.
 */
export { SourceStatusTag, sourceStatusLabel } from "./SourceStatusTag";
export type { SourceStatusTagProps } from "./SourceStatusTag";
