<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;

/**
 * Database-dialect helpers for portable SQL across PostgreSQL and MySQL/MariaDB.
 * Use these when raw SQL would otherwise rely on engine-specific syntax (e.g. ILIKE, ->>).
 */
final class DatabaseDialect
{
    /**
     * Add a case-insensitive LIKE condition (portable alternative to ILIKE).
     * Uses LOWER(column) LIKE ? so it works on both PostgreSQL and MySQL/MariaDB.
     *
     * @param  Builder|QueryBuilder  $query
     * @param  string  $column  Column name (table-qualified if needed, e.g. "orders.customer_name")
     * @param  string  $value   Pattern (e.g. '%search%')
     */
    public static function addCaseInsensitiveLike($query, string $column, string $value): void
    {
        $grammar = $query->getConnection()->getQueryGrammar();
        $wrapped = $grammar->wrap($column);
        $query->whereRaw("LOWER({$wrapped}) LIKE ?", [strtolower($value)]);
    }

    /**
     * Add a case-insensitive LIKE over multiple columns, OR'd together.
     * Use for search boxes that match any of the given columns.
     *
     * @param  Builder|QueryBuilder  $query
     * @param  list<string>  $columns
     * @param  string  $value
     */
    public static function addCaseInsensitiveLikeOr($query, array $columns, string $value): void
    {
        if ($columns === []) {
            return;
        }

        $grammar = $query->getConnection()->getQueryGrammar();
        $value = strtolower($value);

        $query->where(function ($q) use ($grammar, $columns, $value): void {
            foreach ($columns as $i => $column) {
                $wrapped = $grammar->wrap($column);
                $method = $i === 0 ? 'whereRaw' : 'orWhereRaw';
                $q->{$method}("LOWER({$wrapped}) LIKE ?", [$value]);
            }
        });
    }
}
