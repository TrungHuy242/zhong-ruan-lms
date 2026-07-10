/**
 * BulkActionBar — wrapper backward-compat cho module Users.
 *
 * Module Files + future modules sẽ import trực tiếp từ shared/components/layout.
 * Module Users giữ file này để không phá code cũ đang `import { BulkActionBar } from "../components/BulkActionBar"`.
 */
export {
  BulkActionBar,
  type BulkAction,
  type BulkActionBarProps,
} from "../../../shared/components/layout/BulkActionBar";