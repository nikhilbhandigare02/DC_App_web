/** Ported from `lib/models/ddl_option_model.dart`. */
export interface DdlOptionModel {
  label: string;
  value: string;
}

/** Ported from `lib/models/getDaysModel.dart`'s `Data` row. */
export interface DayOptionModel {
  id: number | null;
  name: string | null;
  isSelected: boolean | null;
}
