import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

const toSnakeCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

/** Tablas y columnas en snake_case (participant_type_id, created_at...). */
export class SnakeNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  tableName(targetName: string, userSpecifiedName: string | undefined) {
    return userSpecifiedName ?? toSnakeCase(targetName);
  }

  columnName(
    propertyName: string,
    customName: string | undefined,
    embeddedPrefixes: string[],
  ) {
    return toSnakeCase(
      [...embeddedPrefixes, customName ?? propertyName].join('_'),
    );
  }

  relationName(propertyName: string) {
    return toSnakeCase(propertyName);
  }

  joinColumnName(relationName: string, referencedColumnName: string) {
    return toSnakeCase(`${relationName}_${referencedColumnName}`);
  }

  joinTableName(
    firstTableName: string,
    secondTableName: string,
    firstPropertyName: string,
  ) {
    return toSnakeCase(
      `${firstTableName}_${firstPropertyName.replace(/\./g, '_')}_${secondTableName}`,
    );
  }

  joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ) {
    return toSnakeCase(`${tableName}_${columnName ?? propertyName}`);
  }
}
