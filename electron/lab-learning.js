// Local suggestions use the existing quiz evidence model; lab completion is never a quiz score.
export function recommendLabs(catalog, objectives, attempts) {
  const completed = new Set(attempts.filter((a) => a.status === 'completed').map((a) => a.labId));
  return catalog
    .filter((l) => l.status === 'released')
    .flatMap((lab) => {
      const objective = objectives.find((o) => o.id === lab.objectiveId);
      if (
        objective?.state !== 'Needs review' ||
        lab.prerequisiteLabIds.some((id) => !completed.has(id))
      )
        return [];
      const recent = attempts
        .filter((a) => a.labId === lab.id)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt) || a.id.localeCompare(b.id));
      const active = recent.find((a) => a.status !== 'completed');
      return [
        {
          labId: lab.id,
          title: lab.title,
          objectiveId: lab.objectiveId,
          reason: `${objective.title}: ${objective.recent.correct} of ${objective.recent.total} recent question families correct; marked Needs review by quiz evidence. This is an objective match, not proof of a mistake in this specific lab skill.`,
          attemptId: active?.id ?? null,
          context:
            active?.problemKind === 'environment'
              ? 'Your saved attempt reports an environment/access/policy problem. Resolve access before retrying; this does not count as a conceptual mistake.'
              : completed.has(lab.id)
                ? 'Previously completed as self-reported; another attempt is optional.'
                : 'Practice this objective at your own pace.',
          rate: objective.recent.correct / objective.recent.total,
        },
      ];
    })
    .sort((a, b) => a.rate - b.rate || a.labId.localeCompare(b.labId))
    .slice(0, 3)
    .map(({ rate: _rate, ...item }) => item);
}
