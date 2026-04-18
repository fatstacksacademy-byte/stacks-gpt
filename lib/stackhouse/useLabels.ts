"use client"

import { createContext, useContext } from "react"
import type { LabelsDict } from "./labels.stackhouse"
import { labels as stackhouseLabels } from "./labels.stackhouse"
import { labels as cleanLabels } from "./labels.clean"
import type { StackhouseMode } from "./types"

/**
 * Context-backed access to the active label dictionary. Stackhouse section
 * components read all user-facing strings through this hook. The provider
 * swaps the dictionary (and a mode flag) when the user flips Clean/Stackhouse.
 */
type LabelsContextValue = {
  labels: LabelsDict
  mode: StackhouseMode
}

const LabelsContext = createContext<LabelsContextValue>({
  labels: stackhouseLabels,
  mode: "stackhouse",
})

export const LabelsProvider = LabelsContext.Provider

export function useLabels(): LabelsDict {
  return useContext(LabelsContext).labels
}

export function useMode(): StackhouseMode {
  return useContext(LabelsContext).mode
}

export function labelsFor(mode: StackhouseMode): LabelsDict {
  return mode === "clean" ? cleanLabels : stackhouseLabels
}
