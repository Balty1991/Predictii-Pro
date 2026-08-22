export type ResettablePyramidStep = {
  status: string;
  ticketId: number | null;
};

export function canResetActivePyramidStep(step: ResettablePyramidStep | undefined) {
  return Boolean(step && step.status === "active" && !step.ticketId);
}
