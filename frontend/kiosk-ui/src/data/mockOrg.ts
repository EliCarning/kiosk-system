export interface MockKioskSeed {
  id: string;
  machineName: string;
  displayName: string;
}

export interface MockDepartment {
  id: string;
  name: string;
  kiosks: MockKioskSeed[];
}

export interface MockSite {
  id: string;
  name: string;
  location: string;
  departments: MockDepartment[];
}

export interface MockOrg {
  name: string;
  sites: MockSite[];
}

export const MOCK_ORG: MockOrg = {
  name: "Acme Kiosks",
  sites: [
    {
      id: "site-hq",
      name: "Headquarters",
      location: "New York, NY",
      departments: [
        {
          id: "dept-lobby",
          name: "Lobby",
          kiosks: [
            { id: "k-lobby-01", machineName: "KIOSK-LOBBY-01", displayName: "Lobby Check-in 1" },
            { id: "k-lobby-02", machineName: "KIOSK-LOBBY-02", displayName: "Lobby Check-in 2" },
          ],
        },
        {
          id: "dept-cafeteria",
          name: "Cafeteria",
          kiosks: [
            { id: "k-caf-01", machineName: "KIOSK-CAF-01", displayName: "Cafeteria Order 1" },
          ],
        },
      ],
    },
    {
      id: "site-warehouse",
      name: "West Warehouse",
      location: "Reno, NV",
      departments: [
        {
          id: "dept-shipping",
          name: "Shipping",
          kiosks: [
            { id: "k-ship-01", machineName: "KIOSK-SHIP-01", displayName: "Shipping Scanner 1" },
            { id: "k-ship-02", machineName: "KIOSK-SHIP-02", displayName: "Shipping Scanner 2" },
          ],
        },
        {
          id: "dept-receiving",
          name: "Receiving",
          kiosks: [
            { id: "k-recv-01", machineName: "KIOSK-RECV-01", displayName: "Receiving Dock 1" },
          ],
        },
      ],
    },
  ],
};

export const UNASSIGNED_SITE_ID = "site-unassigned";
export const UNASSIGNED_DEPT_ID = "dept-unassigned";
