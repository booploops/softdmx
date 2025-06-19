export type ActiveChannel = {
  id: number;
  instanceId: string;
  path: string;
  value: number;
};

export type Showfile = {
  name: string;
  fixtures: ShowfileFixture[];
  linkedGroups?: ShowfileLinkedGroup[];
};

export type ShowfileLinkedGroup = {
  name: string;
  names: string[];
}

export type ShowfileFixture = {
  name: string;
  fixtureId: string;
};

export type FixtureChannelDefinition = {
  name: string;
  type: "intensity" | "color" | "effect" | "position" | (string & {});
  minValue: number;
  maxValue: number;
  defaultValue: number;
  reference?: ActiveChannel; // Optional reference to an active channel
};

export type FixtureDefinition = {
  id: string;
  name: string;
  channels: FixtureChannelDefinition[];
};

export type FixtureChannelWithReference = FixtureChannelDefinition & {
  reference: ActiveChannel;
};

export type ShowfileFixtureMapped = {
  fixtureName: string;
  def: FixtureDefinition & {
    channels: FixtureChannelWithReference[];
  };
};
