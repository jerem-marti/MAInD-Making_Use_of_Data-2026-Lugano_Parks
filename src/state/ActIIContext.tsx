import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import parksData from "../data/parks.json";

export type ActIIView = "map" | "park";
export type CycleDirection = "next" | "previous";

export type ActIIState = {
  actIIView: ActIIView;
  selectedParkId: string | null;
  compareOpen: boolean;
};

type ActIIActions = {
  enterPark(parkId: string): void;
  backToMap(): void;
  cyclePark(direction: CycleDirection): void;
  openCompare(): void;
  closeCompare(): void;
  restart(): void;
};

type ActIIContextValue = {
  state: ActIIState;
  actions: ActIIActions;
  parkOrder: string[];
};

type ReducerAction =
  | { type: "enterPark"; parkId: string }
  | { type: "backToMap" }
  | { type: "cyclePark"; direction: CycleDirection }
  | { type: "openCompare" }
  | { type: "closeCompare" }
  | { type: "restart" };

const INITIAL_STATE: ActIIState = {
  actIIView: "map",
  selectedParkId: null,
  compareOpen: false,
};

const PARK_ORDER = [...parksData.parks]
  .sort((a, b) => b.totalWords - a.totalWords)
  .map((park) => park.id);

const ActIIContext = createContext<ActIIContextValue | null>(null);

function actIIReducer(state: ActIIState, action: ReducerAction): ActIIState {
  switch (action.type) {
    case "enterPark":
      return {
        ...state,
        actIIView: "park",
        selectedParkId: action.parkId,
      };
    case "backToMap":
      return {
        ...state,
        actIIView: "map",
        selectedParkId: null,
      };
    case "cyclePark": {
      const selectedIndex = state.selectedParkId
        ? PARK_ORDER.indexOf(state.selectedParkId)
        : -1;
      if (selectedIndex < 0) {
        return {
          ...state,
          actIIView: "park",
          selectedParkId:
            PARK_ORDER[action.direction === "next" ? 0 : PARK_ORDER.length - 1] ??
            null,
        };
      }
      const offset = action.direction === "next" ? 1 : -1;
      const nextIndex =
        (selectedIndex + offset + PARK_ORDER.length) % PARK_ORDER.length;

      return {
        ...state,
        actIIView: "park",
        selectedParkId: PARK_ORDER[nextIndex] ?? null,
      };
    }
    case "openCompare":
      return {
        ...state,
        compareOpen: true,
      };
    case "closeCompare":
      return {
        ...state,
        compareOpen: false,
      };
    case "restart":
      return INITIAL_STATE;
    default:
      return state;
  }
}

function scrollToMapBeat() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const mapBeat = document.getElementById("beat-06");
      if (!mapBeat) return;

      const maxProgressScroll = mapBeat.offsetHeight - window.innerHeight;
      const targetY = mapBeat.offsetTop + Math.max(0, maxProgressScroll) * 0.98;
      window.scrollTo({ top: targetY, left: 0, behavior: "auto" });

      requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
      });
    });
  });
}

function scrollToTop() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  });
}

export function ActIIProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(actIIReducer, INITIAL_STATE);

  const enterPark = useCallback((parkId: string) => {
    dispatch({ type: "enterPark", parkId });
  }, []);

  const backToMap = useCallback(() => {
    dispatch({ type: "backToMap" });
    scrollToMapBeat();
  }, []);

  const cyclePark = useCallback((direction: CycleDirection) => {
    dispatch({ type: "cyclePark", direction });
  }, []);

  const openCompare = useCallback(() => {
    dispatch({ type: "openCompare" });
  }, []);

  const closeCompare = useCallback(() => {
    dispatch({ type: "closeCompare" });
  }, []);

  const restart = useCallback(() => {
    dispatch({ type: "restart" });
    scrollToTop();
  }, []);

  const value = useMemo<ActIIContextValue>(
    () => ({
      state,
      actions: {
        enterPark,
        backToMap,
        cyclePark,
        openCompare,
        closeCompare,
        restart,
      },
      parkOrder: PARK_ORDER,
    }),
    [backToMap, closeCompare, cyclePark, enterPark, openCompare, restart, state],
  );

  return <ActIIContext.Provider value={value}>{children}</ActIIContext.Provider>;
}

export function useActII() {
  const value = useContext(ActIIContext);
  if (!value) {
    throw new Error("useActII must be used within ActIIProvider");
  }
  return value;
}
