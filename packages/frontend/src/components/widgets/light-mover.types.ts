import { FixtureChannelWithReference } from '@softdmx/engine'

export type LightMoverModel = {
  panChannel: FixtureChannelWithReference;
  panFineChannel?: FixtureChannelWithReference;
  tiltChannel: FixtureChannelWithReference;
  tiltFineChannel?: FixtureChannelWithReference;
}
