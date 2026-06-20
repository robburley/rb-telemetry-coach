export interface Garage61AnalysisFixture {
  id: string;
  type: "laps";
  tracks?: Array<string | number>;
  laps: Garage61AnalysisLapGroup[];
  created_at?: string;
  modified_at?: string;
  car_info?: Garage61CarInfo[];
  track_info?: Garage61TrackInfo[];
}

export interface Garage61AnalysisLapGroup {
  lap?: string;
  laps?: Garage61LapFixture[];
  options?: Garage61VisibilityNode;
  settings?: Garage61VisibilityNode;
  state?: Garage61VisibilityNode;
  hidden?: boolean;
  is_hidden?: boolean;
  visible?: boolean;
  is_visible?: boolean;
  active?: boolean;
  inactive?: boolean;
  enabled?: boolean;
  disabled?: boolean;
  selected?: boolean;
  is_selected?: boolean;
}

export interface Garage61LapFixture {
  id: string;
  user?: string;
  lap_number?: number;
  lap_time: number;
  have_samples?: boolean;
  clean?: boolean;
  sectors?: Garage61SectorFixture[];
  can_view_telemetry?: boolean;
  driver_name?: string;
  driver_rating?: number;
  driver?: Garage61DriverFixture;
  car_info?: Garage61CarInfo;
  track_info?: Garage61TrackInfo;
  options?: Garage61VisibilityNode;
  settings?: Garage61VisibilityNode;
  state?: Garage61VisibilityNode;
  hidden?: boolean;
  is_hidden?: boolean;
  visible?: boolean;
  is_visible?: boolean;
  active?: boolean;
  inactive?: boolean;
  enabled?: boolean;
  disabled?: boolean;
  selected?: boolean;
  is_selected?: boolean;
}

export type Garage61VisibilityNode =
  | Garage61VisibilityCarrier
  | Garage61VisibilityCarrier[]
  | null
  | undefined;

export interface Garage61VisibilityCarrier {
  hidden?: boolean;
  is_hidden?: boolean;
  visible?: boolean;
  is_visible?: boolean;
  active?: boolean;
  inactive?: boolean;
  enabled?: boolean;
  disabled?: boolean;
  selected?: boolean;
  is_selected?: boolean;
  options?: Garage61VisibilityNode;
  settings?: Garage61VisibilityNode;
  state?: Garage61VisibilityNode;
  display?: Garage61VisibilityNode;
}

export interface Garage61SectorFixture {
  sector_time?: number;
}

export interface Garage61DriverFixture {
  slug?: string;
  firstname?: string;
  lastname?: string;
}

export interface Garage61CarInfo {
  id: string | number;
  platform?: string;
  name: string;
  shortname?: string;
}

export interface Garage61TrackInfo extends Garage61TrackFixture {}

export interface NormaliseGarage61AnalysisOptions {
  track?: Garage61TrackFixture;
}

export interface Garage61TrackFixture {
  id: string | number;
  platform?: string;
  name: string;
  variant?: string;
  shortname?: string;
  has_map?: boolean;
  sectors?: number[];
  lap_length?: number;
  turns?: number;
  bounds?: [number, number, number, number];
}
