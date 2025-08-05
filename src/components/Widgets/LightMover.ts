import { FixtureChannelWithReference } from "src/types"

export type LightMoverModel = {
  panChannel: FixtureChannelWithReference;
  panFineChannel: FixtureChannelWithReference;
  tiltChannel: FixtureChannelWithReference;
  tiltFineChannel: FixtureChannelWithReference;
}
