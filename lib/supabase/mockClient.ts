import parkingLots from "@/data/parking-lots.json";
import { ParkingLot } from "@/types/parking";

interface QueryResult<T> {
  data: T;
  error: Error | null;
}

export class MockSupabaseClient {
  async listParkingLots(): Promise<QueryResult<ParkingLot[]>> {
    return {
      data: parkingLots as ParkingLot[],
      error: null
    };
  }

  async getParkingLotById(id: string): Promise<QueryResult<ParkingLot | null>> {
    const lot = (parkingLots as ParkingLot[]).find((item) => item.id === id) ?? null;
    return {
      data: lot,
      error: null
    };
  }
}

let singleton: MockSupabaseClient | null = null;

export function getMockSupabaseClient() {
  if (!singleton) {
    singleton = new MockSupabaseClient();
  }
  return singleton;
}
