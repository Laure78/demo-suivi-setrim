import type { ActionItem, ChecklistTemplateId, UserId } from './types';
import { addDays } from './dates';

export type TemplateActionDef = {
  label: string;
  /** Décalage en jours par rapport à la date de début du chantier */
  dayOffset: number;
  defaultAssigneeId: UserId;
};

export type ChecklistTemplate = {
  id: ChecklistTemplateId;
  label: string;
  description: string;
  actions: TemplateActionDef[];
};

/** 3 modèles d'actions par type de chantier. */
export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'refection',
    label: 'Réfection toiture-terrasse',
    description: 'Chantier de réfection — acompte, moyens, situations, DOE',
    actions: [
      { label: "Facture d'acompte envoyée", dayOffset: 0, defaultAssigneeId: 'assistante-1' },
      { label: 'Commande de benne', dayOffset: 2, defaultAssigneeId: 'responsable' },
      { label: 'Location roulotte', dayOffset: 3, defaultAssigneeId: 'responsable' },
      { label: 'Photos avant travaux', dayOffset: 5, defaultAssigneeId: 'melissa' },
      { label: 'Situation n°1', dayOffset: 30, defaultAssigneeId: 'assistante-1' },
      { label: 'DOE transmis', dayOffset: 45, defaultAssigneeId: 'assistante-2' },
    ],
  },
  {
    id: 'neuf',
    label: 'Neuf',
    description: 'Ouvrage neuf — préparation, exécution, réception',
    actions: [
      { label: "Facture d'acompte envoyée", dayOffset: 0, defaultAssigneeId: 'assistante-1' },
      { label: 'Validation plans d’exécution', dayOffset: 7, defaultAssigneeId: 'responsable' },
      { label: 'Commande matériaux', dayOffset: 10, defaultAssigneeId: 'responsable' },
      { label: 'Situation n°1', dayOffset: 30, defaultAssigneeId: 'assistante-1' },
      { label: 'Situation n°2', dayOffset: 60, defaultAssigneeId: 'assistante-1' },
      { label: 'DOE transmis', dayOffset: 90, defaultAssigneeId: 'assistante-2' },
    ],
  },
  {
    id: 'entretien',
    label: 'Entretien',
    description: 'Intervention d’entretien — visite, rapport, facturation',
    actions: [
      { label: 'Prise de RDV client', dayOffset: 0, defaultAssigneeId: 'assistante-2' },
      { label: 'Visite technique', dayOffset: 7, defaultAssigneeId: 'melissa' },
      { label: 'Photos constat', dayOffset: 7, defaultAssigneeId: 'melissa' },
      { label: 'Rapport d’intervention', dayOffset: 10, defaultAssigneeId: 'responsable' },
      { label: 'Facture envoyée', dayOffset: 14, defaultAssigneeId: 'assistante-1' },
    ],
  },
];

export function getTemplate(id: ChecklistTemplateId): ChecklistTemplate {
  return CHECKLIST_TEMPLATES.find((t) => t.id === id) ?? CHECKLIST_TEMPLATES[0];
}

/**
 * Génère la check-list complète à partir d'un modèle,
 * échéances calées sur la date de début (J+offset).
 */
export function buildChecklistFromTemplate(
  templateId: ChecklistTemplateId,
  startDate: string,
  idPrefix = 'act',
): ActionItem[] {
  const tpl = getTemplate(templateId);
  return tpl.actions.map((def, i) => ({
    id: `${idPrefix}-${i + 1}`,
    label: def.label,
    dueDate: addDays(startDate, def.dayOffset),
    done: false,
    assigneeId: def.defaultAssigneeId,
    photos: [],
  }));
}

/** @deprecated — conserver pour imports anciens ; préférer buildChecklistFromTemplate */
export function buildStandardChecklist(
  startDate: string,
  _endDate: string,
  idPrefix = 'act',
): ActionItem[] {
  return buildChecklistFromTemplate('refection', startDate, idPrefix);
}
