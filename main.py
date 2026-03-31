print("RUNNING MAIN FROM:", __file__)

import io
import json
import logging
import random
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import pandas as pd
from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from jinja2 import TemplateError, TemplateNotFound
from pydantic import BaseModel


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger("price_analyzer")

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"
INDEX_TEMPLATE = "index.html"
LATEST_RESULTS_PATH = BASE_DIR / "latest_results.csv"
CODES_PATH = BASE_DIR / "codes.json"
RECIPES_PATH = BASE_DIR / "recipes.json"
QUOTE_COMPARISONS_PATH = BASE_DIR / "quote_comparisons.json"
GUIDE_KNOWLEDGE_PATH = BASE_DIR / "guide_knowledge.json"
OPTIONAL_UNIT_COLUMNS = ["Purchase Unit", "Unit"]
OPTIONAL_QUANTITY_COLUMNS = ["Quantity", "Qty"]
OPTIONAL_UNIT_PRICE_COLUMNS = ["Unit Price", "Price"]
READABLE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
REQUIRED_ANALYSIS_FIELDS = [
    "Product Name",
    "Supplier",
    "Unit",
    "Quantity",
    "Unit Price",
    "Date"
]
REQUIRED_FIELD_SYNONYMS = {
    "Product Name": [
        "product",
        "product name",
        "item",
        "item name",
        "description",
        "item description",
        "product description",
        "material",
        "article"
    ],
    "Supplier": [
        "supplier",
        "supplier name",
        "vendor",
        "vendor name",
        "company",
        "company name",
        "seller"
    ],
    "Unit": [
        "unit",
        "purchase unit",
        "uom",
        "unit of measure",
        "measure",
        "pack size",
        "size"
    ],
    "Quantity": [
        "quantity",
        "qty",
        "amount",
        "ordered qty",
        "ordered quantity",
        "order quantity",
        "purchase quantity",
        "units ordered"
    ],
    "Unit Price": [
        "unit price",
        "price",
        "purchase price",
        "cost",
        "unit cost",
        "item cost",
        "price per unit",
        "invoice price"
    ],
    "Date": [
        "date",
        "invoice date",
        "purchase date",
        "transaction date",
        "posting date",
        "order date",
        "document date"
    ]
}
QUOTE_COMPARE_REQUIRED_FIELDS = [
    "Product Name",
    "Supplier",
    "Unit",
    "Quantity",
    "Unit Price",
    "Date"
]
QUOTE_COMPARE_OPTIONAL_FIELDS = [
    "Total Price",
    "Currency",
    "Delivery Time",
    "Payment Terms",
    "Valid Until",
    "Notes"
]
QUOTE_COMPARE_FIELD_SYNONYMS = {
    "Supplier": [
        "supplier",
        "supplier name",
        "vendor",
        "vendor name",
        "company",
        "seller"
    ],
    "Product Name": [
        "product",
        "product name",
        "item",
        "item name",
        "description",
        "product description"
    ],
    "Unit": [
        "unit",
        "uom",
        "purchase unit",
        "unit of measure",
        "measure"
    ],
    "Quantity": [
        "quantity",
        "qty",
        "amount",
        "order quantity",
        "units"
    ],
    "Unit Price": [
        "unit price",
        "price",
        "quote price",
        "quoted price",
        "cost",
        "unit cost"
    ],
    "Total Price": [
        "total",
        "total price",
        "line total",
        "quote total",
        "extended price"
    ],
    "Currency": [
        "currency",
        "currency code"
    ],
    "Delivery Time": [
        "delivery",
        "delivery time",
        "delivery days",
        "lead time"
    ],
    "Payment Terms": [
        "payment",
        "payment term",
        "terms",
        "payment terms"
    ],
    "Valid Until": [
        "valid until",
        "validity",
        "expiry",
        "expiry date",
        "expiration date"
    ],
    "Notes": [
        "notes",
        "comment",
        "comments",
        "remark",
        "remarks"
    ],
    "Date": [
        "date",
        "quote date",
        "offer date",
        "pricing date",
        "submitted date"
    ]
}
RECIPE_PRICING_MODES = {
    "latest_price": "Latest Price",
    "average_price": "Average Price"
}
QUOTE_COMPARE_DEFAULT_WEIGHTS = {
    "price": 0.5,
    "delivery": 0.25,
    "payment": 0.25
}


def ensure_app_paths() -> None:
    if not STATIC_DIR.is_dir():
        raise RuntimeError(f"Static directory not found: {STATIC_DIR}")
    if not TEMPLATES_DIR.is_dir():
        raise RuntimeError(f"Templates directory not found: {TEMPLATES_DIR}")


def build_templates() -> Jinja2Templates:
    ensure_app_paths()
    templates = Jinja2Templates(directory=str(TEMPLATES_DIR))
    try:
        templates.get_template(INDEX_TEMPLATE)
    except TemplateNotFound as exc:
        raise RuntimeError(f"Required template is missing: {INDEX_TEMPLATE}") from exc
    except TemplateError as exc:
        raise RuntimeError(f"Template validation failed for {INDEX_TEMPLATE}: {exc}") from exc
    return templates


def safe_template_response(
    request: Request,
    name: str,
    context: dict,
    *,
    status_code: int = 200
):
    try:
        return templates.TemplateResponse(
            request=request,
            name=name,
            context=context,
            status_code=status_code
        )
    except TemplateNotFound:
        logger.exception("Template not found while rendering %s", name)
        return HTMLResponse(
            "<h1>Application template missing</h1><p>Please check server logs for details.</p>",
            status_code=500
        )
    except TemplateError:
        logger.exception("Template error while rendering %s", name)
        return HTMLResponse(
            "<h1>Application template error</h1><p>Please check server logs for details.</p>",
            status_code=500
        )


def build_sample_dataframe() -> pd.DataFrame:
    return pd.DataFrame({
        "Product Name": [
            "Eggs",
            "Eggs",
            "Eggs",
            "Eggs",
            "Olive Oil",
            "Olive Oil",
            "Rice",
            "Rice",
            "Coffee Beans",
            "Coffee Beans",
            "Bread",
            "Bread",
            "Sugar",
            "Sugar",
            "Olive Oil",
            "Rice"
        ],
        "Supplier": [
            "Sysco",
            "US Foods",
            "Metro",
            "Metro",
            "Sysco",
            "US Foods",
            "Metro",
            "Sysco",
            "US Foods",
            "Metro",
            "Sysco",
            "US Foods",
            "Metro",
            "Sysco",
            "US Foods",
            "Metro"
        ],
        "Unit": [
            "piece",
            "piece",
            "carton",
            "carton",
            "liter",
            "liter",
            "kg",
            "kg",
            "kg",
            "kg",
            "loaf",
            "loaf",
            "kg",
            "kg",
            "liter",
            "kg"
        ],
        "Quantity": [
            24,
            12,
            3,
            2,
            8,
            5,
            50,
            30,
            12,
            8,
            20,
            14,
            18,
            10,
            6,
            40
        ],
        "Unit Price": [
            0.42,
            0.39,
            4.80,
            5.20,
            12.60,
            13.10,
            2.10,
            2.35,
            17.40,
            18.10,
            3.25,
            3.55,
            1.28,
            1.42,
            14.00,
            2.18
        ],
        "Date": [
            "2026-03-01",
            "2026-03-02",
            "2026-03-03",
            "2026-03-04",
            "2026-03-05",
            "2026-03-06",
            "2026-03-07",
            "2026-03-08",
            "2026-03-09",
            "2026-03-10",
            "2026-03-11",
            "2026-03-12",
            "2026-03-13",
            "2026-03-14",
            "2026-03-15",
            "2026-03-16"
        ]
    })


def build_quote_compare_sample_dataframe() -> pd.DataFrame:
    return pd.DataFrame({
        "Supplier": [
            "Atlas Packaging",
            "Blue Harbor Supply",
            "Northline Goods",
            "Atlas Packaging",
            "Blue Harbor Supply",
            "Northline Goods",
            "Atlas Packaging",
            "Blue Harbor Supply",
            "Northline Goods"
        ],
        "Product Name": [
            "8 oz amber glass jar",
            "8 oz amber glass jar",
            "8 oz amber glass jar",
            "Black phenolic lid 70-400",
            "Black phenolic lid 70-400",
            "Black phenolic lid 70-400",
            "Kraft shipping box 6x6x4",
            "Kraft shipping box 6x6x4",
            "Kraft shipping box 6x6x4"
        ],
        "Unit": [
            "case",
            "case",
            "case",
            "case",
            "case",
            "case",
            "bundle",
            "bundle",
            "bundle"
        ],
        "Quantity": [
            20,
            20,
            20,
            20,
            20,
            20,
            40,
            40,
            40
        ],
        "Unit Price": [
            18.60,
            17.95,
            18.25,
            9.40,
            9.10,
            9.55,
            6.80,
            7.10,
            6.65
        ],
        "Total Price": [
            372.00,
            359.00,
            365.00,
            188.00,
            182.00,
            191.00,
            272.00,
            284.00,
            266.00
        ],
        "Currency": [
            "USD",
            "USD",
            "USD",
            "USD",
            "USD",
            "USD",
            "USD",
            "USD",
            "USD"
        ],
        "Delivery Time": [
            "12 days",
            "16 days",
            "10 days",
            "12 days",
            "16 days",
            "10 days",
            "12 days",
            "16 days",
            "10 days"
        ],
        "Payment Terms": [
            "Net 30",
            "Net 45",
            "Net 21",
            "Net 30",
            "Net 45",
            "Net 21",
            "Net 30",
            "Net 45",
            "Net 21"
        ],
        "Valid Until": [
            "2026-04-30",
            "2026-04-25",
            "2026-04-28",
            "2026-04-30",
            "2026-04-25",
            "2026-04-28",
            "2026-04-30",
            "2026-04-25",
            "2026-04-28"
        ],
        "Notes": [
            "Includes pallet wrap",
            "Freight billed separately",
            "Fastest lead time",
            "Includes liner",
            "Best payment term",
            "Smaller MOQ",
            "Standard corrugate",
            "Freight included",
            "Best landed price"
        ]
    })


def dataframe_to_excel_stream(dataframe: pd.DataFrame, sheet_name: str) -> io.BytesIO:
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        dataframe.to_excel(writer, index=False, sheet_name=sheet_name)
    output.seek(0)
    return output


def get_optional_unit_column(dataframe: pd.DataFrame) -> str | None:
    for column in OPTIONAL_UNIT_COLUMNS:
        if column in dataframe.columns:
            return column
    return None


def get_optional_quantity_column(dataframe: pd.DataFrame) -> str | None:
    for column in OPTIONAL_QUANTITY_COLUMNS:
        if column in dataframe.columns:
            return column
    return None


def get_optional_unit_price_column(dataframe: pd.DataFrame) -> str | None:
    for column in OPTIONAL_UNIT_PRICE_COLUMNS:
        if column in dataframe.columns:
            return column
    return None


def normalize_header_name(value: Any) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", " ", str(value or "").strip().lower())
    return " ".join(cleaned.split())


def score_header_match(normalized_header: str, field_name: str, aliases: list[str]) -> int:
    if not normalized_header:
        return 0

    header_compact = normalized_header.replace(" ", "")
    header_tokens = set(normalized_header.split())
    best_score = 0

    for alias in [field_name, *aliases]:
        normalized_alias = normalize_header_name(alias)
        alias_compact = normalized_alias.replace(" ", "")
        alias_tokens = set(normalized_alias.split())

        if normalized_header == normalized_alias:
            best_score = max(best_score, 160 if alias == field_name else 150)
            continue

        if header_compact == alias_compact:
            best_score = max(best_score, 144)
            continue

        if alias_tokens and alias_tokens.issubset(header_tokens):
            best_score = max(best_score, 118 + min(len(alias_tokens), 5))
            continue

        if header_tokens and header_tokens.issubset(alias_tokens):
            best_score = max(best_score, 106 + min(len(header_tokens), 4))
            continue

        overlap = len(header_tokens & alias_tokens)
        if not overlap:
            continue

        coverage = overlap / max(len(alias_tokens), 1)
        if coverage >= 0.75:
            best_score = max(best_score, 96 + overlap * 4)
        elif coverage >= 0.5:
            best_score = max(best_score, 78 + overlap * 3)

    return best_score


def detect_column_mappings(
    columns: list[str],
    *,
    required_fields: list[str] | None = None,
    field_synonyms: dict[str, list[str]] | None = None
) -> dict[str, Any]:
    required_fields = required_fields or REQUIRED_ANALYSIS_FIELDS
    field_synonyms = field_synonyms or REQUIRED_FIELD_SYNONYMS
    normalized_columns = {column: normalize_header_name(column) for column in columns}
    candidate_matches: list[tuple[int, str, str]] = []

    for field_name in required_fields:
        aliases = field_synonyms[field_name]
        for column, normalized_column in normalized_columns.items():
            score = score_header_match(normalized_column, field_name, aliases)
            if score > 0:
                candidate_matches.append((score, field_name, column))

    field_matches: dict[str, dict[str, Any]] = {
        field_name: {
            "field": field_name,
            "detected_column": None,
            "score": 0,
            "match_quality": "missing"
        }
        for field_name in required_fields
    }
    used_columns: set[str] = set()

    for score, field_name, column in sorted(
        candidate_matches,
        key=lambda item: (-item[0], required_fields.index(item[1]), str(item[2]).lower())
    ):
        if field_matches[field_name]["detected_column"] is not None or column in used_columns:
            continue
        field_matches[field_name]["detected_column"] = column
        field_matches[field_name]["score"] = score
        field_matches[field_name]["match_quality"] = "strong" if score >= 130 else "possible"
        used_columns.add(column)

    mapping = {
        field_name: field_matches[field_name]["detected_column"]
        for field_name in required_fields
    }
    missing_fields = [field_name for field_name, column in mapping.items() if not column]
    optional_columns = [column for column in columns if column not in used_columns]

    return {
        "mapping": mapping,
        "field_reviews": [field_matches[field_name] for field_name in required_fields],
        "matched_fields": len(required_fields) - len(missing_fields),
        "missing_fields": missing_fields,
        "optional_columns": optional_columns,
        "headers": columns
    }


def apply_column_mapping(
    dataframe: pd.DataFrame,
    mapping: dict[str, str | None],
    *,
    required_fields: list[str] | None = None
) -> pd.DataFrame:
    required_fields = required_fields or REQUIRED_ANALYSIS_FIELDS
    missing_fields = [field_name for field_name in required_fields if not mapping.get(field_name)]
    if missing_fields:
        raise ValueError(f"Missing required field mappings: {', '.join(missing_fields)}")

    missing_columns = [
        mapped_column
        for mapped_column in mapping.values()
        if mapped_column and mapped_column not in dataframe.columns
    ]
    if missing_columns:
        raise ValueError(
            f"Mapped columns were not found in the uploaded file: {', '.join(sorted(set(missing_columns)))}"
        )

    return pd.DataFrame({
        field_name: dataframe[mapped_column]
        for field_name, mapped_column in mapping.items()
        if mapped_column
    })


def read_uploaded_dataframe(file: UploadFile) -> pd.DataFrame:
    filename = file.filename or ""
    extension = Path(filename).suffix.lower()

    if not filename:
        raise ValueError("No file was uploaded.")

    try:
        file.file.seek(0)
        first_byte = file.file.read(1)
        file.file.seek(0)
    except Exception as exc:
        logger.exception("Failed to reset uploaded file pointer: %s", filename)
        raise ValueError("The uploaded file could not be prepared for reading.") from exc

    if not first_byte:
        raise ValueError("The uploaded file is empty.")

    try:
        logger.info(
            "[upload debug] reading uploaded file: filename=%s extension=%s",
            filename,
            extension
        )
        if extension == ".csv":
            file.file.seek(0)
            dataframe = pd.read_csv(file.file, dtype=object)
        elif extension == ".xlsx":
            try:
                file.file.seek(0)
                dataframe = pd.read_excel(file.file, engine="openpyxl", dtype=object)
                logger.info(
                    "[upload debug] parsed .xlsx with engine=openpyxl: filename=%s",
                    filename
                )
            except ImportError:
                raise
            except Exception as openpyxl_exc:
                logger.warning(
                    "[upload debug] openpyxl parse failed for filename=%s extension=%s error=%s",
                    filename,
                    extension,
                    openpyxl_exc
                )
                try:
                    file.file.seek(0)
                    dataframe = pd.read_excel(file.file, engine="calamine", dtype=object)
                    logger.info(
                        "[upload debug] parsed .xlsx with fallback engine=calamine: filename=%s",
                        filename
                    )
                except ImportError as calamine_exc:
                    logger.warning(
                        "[upload debug] calamine unavailable for filename=%s extension=%s error=%s",
                        filename,
                        extension,
                        calamine_exc
                    )
                    raise ValueError(
                        "This Excel workbook could not be parsed with openpyxl. Install python-calamine for broader Excel compatibility, or re-save the workbook as a new .xlsx file and try again."
                    ) from openpyxl_exc
                except Exception as calamine_exc:
                    logger.warning(
                        "[upload debug] calamine parse failed for filename=%s extension=%s error=%s",
                        filename,
                        extension,
                        calamine_exc
                    )
                    raise ValueError(
                        "This Excel workbook could not be parsed. Please re-save the workbook as a new .xlsx file and try again."
                    ) from calamine_exc
        elif extension == ".xls":
            file.file.seek(0)
            dataframe = pd.read_excel(file.file, dtype=object)
        else:
            raise ValueError("Unsupported file type. Please upload a CSV or Excel file (.csv, .xlsx, or .xls).")
    except ImportError as exc:
        if extension == ".xlsx":
            raise ValueError("Excel support for .xlsx files is not installed. Add openpyxl to enable Excel uploads.") from exc
        if extension == ".xls":
            raise ValueError("Legacy Excel support for .xls files is not installed. Add xlrd to enable .xls uploads.") from exc
        raise
    except ValueError:
        raise
    except Exception as exc:
        logger.exception("Failed to parse uploaded file: %s", filename)
        if extension == ".xlsx":
            raise ValueError("The .xlsx file could not be read. Please upload a valid Excel workbook.") from exc
        if extension == ".xls":
            raise ValueError("The .xls file could not be read. Please upload a valid legacy Excel workbook.") from exc
        if extension == ".csv":
            raise ValueError("The .csv file could not be read. Please upload a valid CSV file.") from exc
        raise
    finally:
        try:
            file.file.seek(0)
        except Exception:
            logger.debug("Could not reset uploaded file pointer after parsing: %s", filename)

    if dataframe is None or dataframe.columns.empty:
        raise ValueError("The uploaded file does not contain any readable columns.")

    return dataframe


def build_mapping_review_payload(
    dataframe: pd.DataFrame,
    *,
    filename: str,
    required_fields: list[str] | None = None,
    field_synonyms: dict[str, list[str]] | None = None,
    message: str | None = None,
    review_message: str | None = None
) -> dict[str, Any]:
    required_fields = required_fields or REQUIRED_ANALYSIS_FIELDS
    field_synonyms = field_synonyms or REQUIRED_FIELD_SYNONYMS
    columns = [str(column) for column in dataframe.columns]
    logger.info(
        "[upload debug] extracted dataframe columns for %s: %s",
        filename,
        columns
    )
    detection = detect_column_mappings(
        columns,
        required_fields=required_fields,
        field_synonyms=field_synonyms
    )
    logger.info(
        "[upload debug] mapping review payload for %s: matched=%s missing=%s headers=%s",
        filename,
        detection.get("matched_fields"),
        detection.get("missing_fields"),
        detection.get("headers")
    )
    return {
        "filename": filename,
        "required_fields": required_fields,
        "message": message or "We detected likely matches from your file headers.",
        "review_message": review_message or "Review and confirm the fields below before analysis.",
        **detection
    }


def ensure_codes_file() -> None:
    if CODES_PATH.exists():
        return

    default_codes = {
        "PPA-AB12-CD3": {"active": True, "session_id": None}
    }
    CODES_PATH.write_text(json.dumps(default_codes, indent=2), encoding="utf-8")


def load_codes() -> dict:
    ensure_codes_file()
    try:
        codes = json.loads(CODES_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid codes file: {CODES_PATH}") from exc
    changed = False
    for code, entry in codes.items():
        if not isinstance(entry, dict):
            codes[code] = {"active": bool(entry), "session_id": None}
            changed = True
            continue
        if "active" not in entry:
            entry["active"] = False
            changed = True
        if "session_id" not in entry:
            entry["session_id"] = None
            changed = True
    if changed:
        save_codes(codes)
    return codes


def save_codes(codes: dict) -> None:
    CODES_PATH.write_text(json.dumps(codes, indent=2), encoding="utf-8")


def normalize_access_code(code: str) -> str:
    return (code or "").strip().upper()


def generate_access_code() -> str:
    prefix = "PPA"
    middle = "".join(random.choice(READABLE_CODE_ALPHABET) for _ in range(4))
    suffix = "".join(random.choice(READABLE_CODE_ALPHABET) for _ in range(3))
    return f"{prefix}-{middle}-{suffix}"


def create_unique_access_code() -> str:
    codes = load_codes()
    while True:
        candidate = generate_access_code()
        if candidate not in codes:
            codes[candidate] = {"active": True, "session_id": None}
            save_codes(codes)
            return candidate


def create_session_id() -> str:
    return str(uuid.uuid4())


def normalize_session_id(session_id: str | None) -> str | None:
    normalized_session_id = (session_id or "").strip() or None
    if normalized_session_id and normalized_session_id.lower() in {"null", "none"}:
        return None
    return normalized_session_id


def validate_access_code_session(code: str, session_id: str | None) -> dict:
    normalized_code = normalize_access_code(code)
    normalized_session_id = normalize_session_id(session_id)
    if not normalized_code:
        response = {"success": False, "message": "Invalid code"}
        logger.info(
            "Access code validation rejected | stored session_id=%s | incoming session_id=%s | response=%s",
            None,
            normalized_session_id,
            response
        )
        return response

    codes = load_codes()
    code_entry = codes.get(normalized_code)
    if not code_entry or not code_entry.get("active"):
        response = {"success": False, "message": "Invalid code"}
        logger.info(
            "Access code validation rejected for %s | stored session_id=%s | incoming session_id=%s | response=%s",
            normalized_code,
            None if not code_entry else code_entry.get("session_id"),
            normalized_session_id,
            response
        )
        return response

    current_session_id = normalize_session_id(code_entry.get("session_id"))
    if code_entry.get("session_id") != current_session_id:
        code_entry["session_id"] = current_session_id
        save_codes(codes)

    logger.info(
        "Access code validation start for %s | stored session_id=%s | incoming session_id=%s",
        normalized_code,
        current_session_id,
        normalized_session_id
    )

    if current_session_id is None:
        new_session_id = create_session_id()
        code_entry["session_id"] = new_session_id
        save_codes(codes)
        response = {
            "success": True,
            "code": normalized_code,
            "session_id": new_session_id
        }
        print("FLOW: NEW SESSION CREATED")
        logger.info(
            "Access code validation success for %s | stored session_id=%s | incoming session_id=%s | response=%s",
            normalized_code,
            current_session_id,
            normalized_session_id,
            response
        )
        return response

    if normalized_session_id == current_session_id:
        response = {
            "success": True,
            "code": normalized_code,
            "session_id": current_session_id
        }
        print("FLOW: EXISTING SESSION MATCH")
        logger.info(
            "Access code validation success for %s | stored session_id=%s | incoming session_id=%s | response=%s",
            normalized_code,
            current_session_id,
            normalized_session_id,
            response
        )
        return response

    response = {
        "success": False,
        "message": "This access code is already in use on another session."
    }
    print("FLOW: REJECT")
    logger.info(
        "Access code validation reject for %s | stored session_id=%s | incoming session_id=%s | response=%s",
        normalized_code,
        current_session_id,
        normalized_session_id,
        response
    )
    return response


def logout_access_code_session(code: str, session_id: str | None) -> bool:
    normalized_code = normalize_access_code(code)
    normalized_session_id = (session_id or "").strip() or None
    if not normalized_code or not normalized_session_id:
        return False

    codes = load_codes()
    code_entry = codes.get(normalized_code)
    if not code_entry or code_entry.get("session_id") != normalized_session_id:
        return False

    code_entry["session_id"] = None
    save_codes(codes)
    return True


class AccessCodePayload(BaseModel):
    code: str


class AccessSessionPayload(BaseModel):
    code: str
    session_id: str | None = None


class AskDataPayload(BaseModel):
    question: str
    rows: list[dict[str, Any]] | None = None


class GuideAskPayload(BaseModel):
    question: str


class UploadMappingPayload(BaseModel):
    mappings: dict[str, str | None]


class RecipeIngredientPayload(BaseModel):
    product_name: str
    quantity: float
    unit: str


class RecipePayload(BaseModel):
    recipe_id: str | None = None
    name: str
    yield_portions: float
    pricing_mode: str
    ingredients: list[RecipeIngredientPayload]


class RecipeDeletePayload(BaseModel):
    recipe_id: str


class QuoteBidPayload(BaseModel):
    supplier_name: str
    product_name: str
    unit: str
    quantity: float
    unit_price: float | None = None
    total_price: float | None = None
    quote_date: str | None = None
    currency: str
    delivery_time: str
    payment_term: str
    valid_until: str | None = None
    notes: str | None = None


class QuoteComparisonPayload(BaseModel):
    comparison_id: str | None = None
    name: str
    sourcing_need: str | None = None
    bids: list[QuoteBidPayload]
    weighting: dict[str, float] | None = None
    source_type: str | None = None
    mode: str | None = None


class QuoteComparisonDeletePayload(BaseModel):
    comparison_id: str


def format_currency(value: float) -> str:
    return f"${value:,.2f}"


def format_percent(value: float) -> str:
    return f"{value:.1f}%"


def format_period_label(period_value: pd.Period | None) -> str:
    if period_value is None:
        return "Current visible period"
    return period_value.strftime("%B %Y")


def coalesce_number(primary: Any, fallback: Any = 0) -> float:
    if pd.notna(primary):
        return float(primary)
    if pd.notna(fallback):
        return float(fallback)
    return 0.0


def parse_bool_flag(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    text = str(value).strip().lower()
    if text in {"true", "1", "yes", "on"}:
        return True
    if text in {"false", "0", "no", "off", ""}:
        return False
    return False


def safe_int(value: Any, default: int = 0) -> int:
    if value is None:
        return default
    text = str(value).strip().lower()
    if text in {"true", "false", ""}:
        return default
    try:
        return int(float(text))
    except (TypeError, ValueError):
        return default


def normalize_value(value: Any) -> Any:
    if value is None:
        return None
    if value is pd.NA:
        return None
    try:
        if pd.isna(value):
            return None
    except TypeError:
        pass

    if isinstance(value, bool):
        return value

    if hasattr(value, "item") and not isinstance(value, (str, bytes)):
        try:
            normalized_item = value.item()
        except (TypeError, ValueError):
            normalized_item = value
        if normalized_item is not value:
            return normalize_value(normalized_item)

    if isinstance(value, pd.Timestamp):
        return value.isoformat()

    if isinstance(value, str):
        stripped = value.strip()
        lowered = stripped.lower()
        if lowered in {"true", "false"}:
            return stripped
        if re.fullmatch(r"[+-]?\d+", stripped):
            return safe_int(stripped)
        return stripped

    return value


def normalize_request_value(value: Any) -> Any:
    return normalize_value(value)


def coerce_numeric_value(value: Any, *, field_name: str, context: str) -> float:
    normalized_value = normalize_value(value)
    if normalized_value is None or normalized_value == "":
        return 0.0
    if isinstance(normalized_value, bool):
        logger.info(
            "[quote compare upload] preserving boolean-like value for %s (%s): %r",
            field_name,
            context,
            normalized_value
        )
        return 0.0
    if isinstance(normalized_value, str) and normalized_value.lower() in {"true", "false"}:
        logger.info(
            "[quote compare upload] preserving boolean-like string for %s (%s): %r",
            field_name,
            context,
            normalized_value
        )
        return 0.0

    try:
        return float(normalized_value)
    except (TypeError, ValueError):
        logger.warning(
            "[quote compare upload] failed numeric coercion for %s (%s): type=%s value=%r",
            field_name,
            context,
            type(normalized_value).__name__,
            normalized_value
        )
        return 0.0


def normalize_text_value(value: Any) -> str:
    normalized_value = normalize_value(value)
    if normalized_value is None:
        return ""
    if isinstance(normalized_value, bool):
        return str(normalized_value)
    return str(normalized_value).strip()


def ensure_recipes_file() -> None:
    if RECIPES_PATH.exists():
        return
    RECIPES_PATH.write_text(json.dumps({"recipes": []}, indent=2), encoding="utf-8")


def load_recipes_store() -> dict[str, Any]:
    ensure_recipes_file()
    try:
        store = json.loads(RECIPES_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid recipes file: {RECIPES_PATH}") from exc

    recipes = store.get("recipes")
    if not isinstance(recipes, list):
        store["recipes"] = []
        save_recipes_store(store)
    return store


def save_recipes_store(store: dict[str, Any]) -> None:
    RECIPES_PATH.write_text(json.dumps(store, indent=2), encoding="utf-8")


def ensure_quote_comparisons_file() -> None:
    if QUOTE_COMPARISONS_PATH.exists():
        return
    QUOTE_COMPARISONS_PATH.write_text(json.dumps({"comparisons": []}, indent=2), encoding="utf-8")


def load_quote_comparisons_store() -> dict[str, Any]:
    ensure_quote_comparisons_file()
    try:
        store = json.loads(QUOTE_COMPARISONS_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid quote comparisons file: {QUOTE_COMPARISONS_PATH}") from exc

    changed = False
    comparisons = store.get("comparisons")
    if not isinstance(comparisons, list):
        store["comparisons"] = []
        changed = True
    active_sessions = store.get("active_sessions")
    if not isinstance(active_sessions, dict):
        store["active_sessions"] = {}
        changed = True
    if changed:
        save_quote_comparisons_store(store)
    return store


def save_quote_comparisons_store(store: dict[str, Any]) -> None:
    QUOTE_COMPARISONS_PATH.write_text(json.dumps(store, indent=2), encoding="utf-8")


def serialize_dataframe_records(dataframe: pd.DataFrame) -> list[dict[str, Any]]:
    serializable = dataframe.astype(object).where(pd.notna(dataframe), None)
    records: list[dict[str, Any]] = []
    for row in serializable.to_dict(orient="records"):
        records.append({
            str(key): normalize_value(value)
            for key, value in row.items()
        })
    return records


def hydrate_dataframe_from_session(columns: list[str], records: list[dict[str, Any]]) -> pd.DataFrame:
    if not isinstance(columns, list):
        columns = []
    if not isinstance(records, list):
        records = []
    dataframe = pd.DataFrame(records)
    if columns:
        dataframe = dataframe.reindex(columns=columns)
    return dataframe


def save_quote_compare_active_session(session_id: str, payload: dict[str, Any]) -> None:
    store = load_quote_comparisons_store()
    active_sessions = store.get("active_sessions", {})
    active_sessions[session_id] = payload
    store["active_sessions"] = active_sessions
    save_quote_comparisons_store(store)


def load_quote_compare_active_session(session_id: str | None) -> dict[str, Any] | None:
    if not session_id:
        return None
    return load_quote_comparisons_store().get("active_sessions", {}).get(session_id)


def validate_quote_compare_active_session(session_payload: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(session_payload, dict):
        return None

    session_id = str(session_payload.get("session_id") or "").strip()
    step = str(session_payload.get("step") or "").strip().lower()
    dataframe = session_payload.get("dataframe") or {}
    headers = session_payload.get("headers")
    dataframe_columns = dataframe.get("columns") if isinstance(dataframe, dict) else None
    dataframe_records = dataframe.get("records") if isinstance(dataframe, dict) else None

    if not session_id or step not in {"review", "analyze"}:
        return None
    if not isinstance(headers, list) or not headers:
        return None
    if not isinstance(dataframe_columns, list) or not dataframe_columns:
        return None
    if not isinstance(dataframe_records, list):
        return None

    if step == "review":
        return session_payload

    comparison = session_payload.get("comparison")
    evaluation = session_payload.get("evaluation")
    if not isinstance(comparison, dict) or not isinstance(evaluation, dict):
        return None

    return session_payload


GUIDE_ASSISTANT_FALLBACK = "I couldn't find that feature in this tool yet."
GUIDE_ASSISTANT_STOPWORDS = {
    "a", "an", "and", "are", "can", "do", "find", "for", "help", "how", "i", "in",
    "is", "me", "my", "of", "the", "this", "to", "use", "with", "you", "your"
}
GUIDE_ASSISTANT_SYNONYMS = {
    "analyse": "analyze",
    "analysing": "analyze",
    "analysis": "analyze",
    "comparing": "compare",
    "comparison": "compare",
    "differences": "compare",
    "difference": "compare",
    "inspect": "review",
    "inspecting": "review",
    "vendors": "supplier",
    "vendor": "supplier",
    "suppliers": "supplier",
    "prices": "price",
    "pricing": "price",
    "cost": "price",
    "costs": "price",
    "overpaying": "overpay",
    "overspend": "overpay",
    "overspending": "overpay",
    "expensive": "overpay",
    "opportunity": "savings",
    "opportunities": "savings",
    "margin": "savings",
    "add": "upload",
    "import": "upload",
    "importing": "upload",
    "adding": "upload",
    "recipes": "recipe",
    "ingredients": "ingredient",
    "menu": "recipe",
    "food": "recipe"
}
GUIDE_ACTION_CATALOG = {
    "go_analyzer": {"label": "Open Analyzer", "href": "/"},
    "go_upload": {"label": "Go to Upload & Analyze", "href": "/#uploadPanel"},
    "go_top_insights": {"label": "Go to Top Insights", "href": "/#topInsightsPanel"},
    "go_workspace": {"label": "Open Workspace Table", "href": "/#workspacePanel"},
    "go_ask_data": {"label": "Open Ask Your Data", "href": "/#askDataPanel"},
    "go_quote_compare": {"label": "Open Quote Compare", "href": "/quote-compare"},
    "go_recipes": {"label": "Open Recipes", "href": "/recipes"}
}


def load_guide_knowledge() -> list[dict[str, Any]]:
    try:
        payload = json.loads(GUIDE_KNOWLEDGE_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError:
        logger.warning("Guide knowledge file not found: %s", GUIDE_KNOWLEDGE_PATH)
        return []
    except json.JSONDecodeError:
        logger.exception("Guide knowledge file is invalid: %s", GUIDE_KNOWLEDGE_PATH)
        return []

    entries = payload.get("entries", [])
    return entries if isinstance(entries, list) else []


def normalize_guide_text(value: str) -> str:
    cleaned = re.sub(r"[^a-z0-9]+", " ", str(value or "").strip().lower())
    normalized_tokens = []
    for token in cleaned.split():
        normalized_tokens.append(GUIDE_ASSISTANT_SYNONYMS.get(token, token))
    return " ".join(normalized_tokens)


def tokenize_guide_text(value: str) -> set[str]:
    return {
        token for token in normalize_guide_text(value).split()
        if len(token) > 2 and token not in GUIDE_ASSISTANT_STOPWORDS
    }


def find_guide_answer(question: str) -> dict[str, Any]:
    normalized_question = normalize_guide_text(question)
    question_tokens = tokenize_guide_text(question)
    best_entry: dict[str, Any] | None = None
    best_score = 0

    for entry in load_guide_knowledge():
        title = normalize_guide_text(entry.get("title", ""))
        intents = [normalize_guide_text(intent) for intent in entry.get("intents", []) if intent]
        keywords = [normalize_guide_text(keyword) for keyword in entry.get("keywords", []) if keyword]
        synonyms = [normalize_guide_text(keyword) for keyword in entry.get("synonyms", []) if keyword]
        examples = [normalize_guide_text(example) for example in entry.get("example_questions", []) if example]
        intent_groups = [set(tokenize_guide_text(value)) for value in entry.get("intent_groups", []) if value]
        weighted_phrase_groups = [
            ("title", [value for value in [title] if value]),
            ("intent", intents),
            ("example", examples),
            ("synonym", synonyms)
        ]
        candidate_keywords = [*keywords, *synonyms]
        score = 0
        phrase_match = False
        entry_token_pool = set()

        for group_name, values in weighted_phrase_groups:
            for candidate in values:
                candidate_tokens = set(candidate.split())
                entry_token_pool.update(candidate_tokens)
                overlap = len(candidate_tokens & question_tokens)
                exact_weight = 13 if group_name == "intent" else 11
                contains_weight = 10 if group_name in {"intent", "example"} else 8
                subset_weight = 8 if group_name == "intent" else 6
                overlap_weight = 5 if group_name in {"intent", "example"} else 3

                if normalized_question == candidate:
                    score += exact_weight
                    phrase_match = True
                elif candidate in normalized_question:
                    score += contains_weight
                    phrase_match = True
                elif candidate_tokens and candidate_tokens.issubset(question_tokens):
                    score += subset_weight
                    phrase_match = True
                elif overlap >= 2:
                    score += overlap_weight
                    phrase_match = True

        for intent_group in intent_groups:
            entry_token_pool.update(intent_group)
            if intent_group and len(intent_group & question_tokens) >= min(len(intent_group), 2):
                score += 7
                phrase_match = True

        keyword_hits = 0
        for keyword in candidate_keywords:
            if not keyword:
                continue
            keyword_tokens = set(keyword.split())
            entry_token_pool.update(keyword_tokens)
            if keyword in normalized_question:
                keyword_hits += 1
            elif keyword_tokens and keyword_tokens.issubset(question_tokens):
                keyword_hits += 1
            elif len(keyword_tokens & question_tokens) >= 1:
                keyword_hits += 1

        score += keyword_hits * 2
        if phrase_match and keyword_hits:
            score += 2

        if question_tokens and entry_token_pool:
            token_overlap = len(question_tokens & entry_token_pool)
            if token_overlap:
                score += token_overlap

        if score > best_score:
            best_score = score
            best_entry = entry

    if not best_entry or best_score < 6:
        return {
            "found": False,
            "id": None,
            "title": "Guide Assistant",
            "answer": GUIDE_ASSISTANT_FALLBACK,
            "related_section": None,
            "next_step": None,
            "actions": [],
            "workflow_steps": []
        }

    return {
        "found": True,
        "id": best_entry.get("id"),
        "title": str(best_entry.get("title") or "Guide Answer"),
        "answer": str(best_entry.get("answer") or GUIDE_ASSISTANT_FALLBACK),
        "related_section": best_entry.get("related_section"),
        "next_step": best_entry.get("next_step"),
        "actions": list(best_entry.get("actions") or []),
        "workflow_steps": [str(step) for step in best_entry.get("workflow_steps", []) if step]
    }


def load_latest_results_frame() -> pd.DataFrame | None:
    if not LATEST_RESULTS_PATH.exists():
        return None
    try:
        frame = pd.read_csv(LATEST_RESULTS_PATH)
    except Exception:
        logger.exception("Failed to load latest results for Guide context")
        return None
    return frame if not frame.empty else None


def build_guide_analysis_snapshot() -> dict[str, Any] | None:
    frame = load_latest_results_frame()
    if frame is None:
        return None

    overpay_rows = int((frame["Status"] == "Overpay").sum()) if "Status" in frame else 0
    total_rows = int(len(frame))
    total_savings = round(float(frame["Savings Opportunity"].fillna(0).sum()), 2) if "Savings Opportunity" in frame else 0.0

    compare_ready_products = 0
    if {"Product Display", "Supplier"}.issubset(frame.columns):
        compare_ready_products = int((frame.groupby("Product Display")["Supplier"].nunique() > 1).sum())

    top_supplier = None
    if {"Supplier", "Savings Opportunity"}.issubset(frame.columns):
        supplier_savings = (
            frame.groupby("Supplier", as_index=False)["Savings Opportunity"]
            .sum()
            .sort_values("Savings Opportunity", ascending=False)
        )
        if not supplier_savings.empty:
            top_supplier = str(supplier_savings.iloc[0]["Supplier"])

    highest_risk_product = None
    if {"Product Display", "Savings Opportunity"}.issubset(frame.columns):
        product_savings = (
            frame.groupby("Product Display", as_index=False)["Savings Opportunity"]
            .sum()
            .sort_values("Savings Opportunity", ascending=False)
        )
        if not product_savings.empty:
            highest_risk_product = str(product_savings.iloc[0]["Product Display"])

    return {
        "total_rows": total_rows,
        "overpay_rows": overpay_rows,
        "total_savings": total_savings,
        "compare_ready_products": compare_ready_products,
        "top_supplier": top_supplier,
        "highest_risk_product": highest_risk_product
    }


def resolve_guide_actions(action_ids: list[str] | None) -> list[dict[str, str]]:
    resolved: list[dict[str, str]] = []
    for action_id in action_ids or []:
        action = GUIDE_ACTION_CATALOG.get(str(action_id))
        if not action:
            continue
        if any(existing["href"] == action["href"] for existing in resolved):
            continue
        resolved.append({"label": action["label"], "href": action["href"]})
    return resolved


def append_guide_action(actions: list[dict[str, str]], action_id: str) -> list[dict[str, str]]:
    action = GUIDE_ACTION_CATALOG.get(action_id)
    if not action:
        return actions
    if any(existing["href"] == action["href"] for existing in actions):
        return actions
    return [*actions, {"label": action["label"], "href": action["href"]}]


def build_beginner_guide_steps(snapshot: dict[str, Any] | None) -> list[str]:
    if not snapshot:
        return [
            "Step 1: Upload your purchasing file and confirm the mapped columns before analysis.",
            "Step 2: Review Top Insights to spot the biggest margin leaks first.",
            "Step 3: Open the Workspace Table to compare suppliers on repeated price differences.",
            "Step 4: Filter high-volume or high-savings items so you can prioritize action.",
            "Step 5: Use Ask Your Data for an executive-ready summary once the evidence is clear."
        ]

    step_two = "Step 2: Review Top Insights for the biggest margin leaks in the current analysis."
    if snapshot["overpay_rows"] > 0:
        step_two = f"Step 2: Review Top Insights first because the current analysis already shows {snapshot['overpay_rows']} overpay rows."

    step_three = "Step 3: Open the Workspace Table to compare suppliers where price gaps repeat."
    if snapshot["compare_ready_products"] > 0:
        step_three = f"Step 3: Compare suppliers in the Workspace Table because {snapshot['compare_ready_products']} product groups already show supplier variation."

    step_four = "Step 4: Filter the highest-volume or highest-savings items so you can prioritize effort."
    if snapshot["total_savings"] > 0:
        step_four = f"Step 4: Prioritize the highest-savings items first because the current visible opportunity is about ${snapshot['total_savings']:,.2f}."

    return [
        "Step 1: Upload your purchasing file and confirm the mapped columns before analysis.",
        step_two,
        step_three,
        step_four,
        "Step 5: Use Ask Your Data for an executive-ready summary once the evidence is clear."
    ]


def build_guide_response(question: str) -> dict[str, Any]:
    response = find_guide_answer(question)
    snapshot = build_guide_analysis_snapshot()
    actions = resolve_guide_actions(response.get("actions"))
    workflow_steps = [str(step) for step in response.get("workflow_steps", []) if step]
    context_note = None

    if response.get("id") == "beginner-flow":
        workflow_steps = build_beginner_guide_steps(snapshot)
        for action_id in ["go_upload", "go_top_insights", "go_workspace", "go_ask_data"]:
            actions = append_guide_action(actions, action_id)
    elif snapshot and response.get("found"):
        response_id = response.get("id")
        if response_id == "compare-suppliers":
            if snapshot["compare_ready_products"] > 0:
                context_note = (
                    f"Current analysis already contains {snapshot['compare_ready_products']} product groups with multiple suppliers, "
                    "so supplier comparison is immediately available."
                )
                actions = append_guide_action(actions, "go_workspace")
            if snapshot.get("top_supplier"):
                response["next_step"] = (
                    f"Start with {snapshot['top_supplier']} in Top Insights, then compare that supplier against alternatives in the Workspace Table."
                )
        elif response_id == "review-supplier-pricing":
            if snapshot.get("top_supplier"):
                context_note = f"{snapshot['top_supplier']} currently appears as the strongest supplier signal to review first."
            if snapshot["overpay_rows"] > 0:
                response["next_step"] = (
                    "Open Top Insights to see which supplier is contributing to repeated overpay, then inspect that supplier across the Workspace Table."
                )
        elif response_id == "find-overpay-rows" and snapshot["overpay_rows"] > 0:
            context_note = f"The current analysis shows {snapshot['overpay_rows']} rows already flagged as Overpay."
            actions = append_guide_action(actions, "go_top_insights")
            actions = append_guide_action(actions, "go_workspace")
        elif response_id == "savings-opportunities" and snapshot["total_savings"] > 0:
            context_note = f"The current visible savings opportunity is about ${snapshot['total_savings']:,.2f}."
            actions = append_guide_action(actions, "go_top_insights")
        elif response_id == "use-recipes" and snapshot["total_rows"] > 0:
            context_note = f"The current analysis already contains {snapshot['total_rows']} rows, so Recipes can use that purchasing data as its cost source."
            actions = append_guide_action(actions, "go_recipes")
        elif response_id == "upload-and-mapping" and snapshot["total_rows"] > 0:
            context_note = f"A saved analysis with {snapshot['total_rows']} rows is already available if you want to review before replacing it."
            actions = append_guide_action(actions, "go_analyzer")

    return {
        **response,
        "actions": actions,
        "workflow_steps": workflow_steps,
        "context_note": context_note,
        "context_available": snapshot is not None
    }


def parse_days_from_text(value: str | None) -> int | None:
    value = normalize_request_value(value)
    text = str(value or "").strip().lower()
    if not text:
        return None
    match = re.search(r"(\d+(?:\.\d+)?)", text)
    if not match:
        return None
    return max(safe_int(match.group(1)), 0)


def parse_payment_term_days(value: str | None) -> int | None:
    text = str(value or "").strip().lower()
    if not text:
        return None
    if "advance" in text or "prepay" in text or "upfront" in text or "cash" in text:
        return 0
    return parse_days_from_text(text)


def normalize_quote_weighting(weighting: dict[str, Any] | None = None) -> dict[str, float]:
    normalized = {}
    source = weighting or {}
    for key, default_value in QUOTE_COMPARE_DEFAULT_WEIGHTS.items():
        raw_value = normalize_value(source.get(key, default_value))
        if isinstance(raw_value, bool) or (
            isinstance(raw_value, str) and raw_value.lower() in {"true", "false", ""}
        ) or raw_value is None:
            logger.info(
                "[quote compare upload] preserving non-numeric weighting for %s: %r",
                key,
                raw_value
            )
            normalized[key] = default_value
            continue
        try:
            normalized[key] = max(float(raw_value), 0.0)
        except (TypeError, ValueError):
            logger.warning(
                "[quote compare upload] failed numeric coercion for %s (quote weighting): type=%s value=%r",
                key,
                type(raw_value).__name__,
                raw_value
            )
            normalized[key] = default_value

    total_weight = sum(normalized.values())
    if total_weight <= 0:
        return dict(QUOTE_COMPARE_DEFAULT_WEIGHTS)

    return {
        key: round(value / total_weight, 4)
        for key, value in normalized.items()
    }


def normalize_quote_comparison_payload(payload: dict[str, Any]) -> dict[str, Any]:
    normalized_bids: list[dict[str, Any]] = []
    for index, bid in enumerate(payload.get("bids", []), start=1):
        row_context = f"normalized payload row {index}"
        supplier_name = normalize_text_value(bid.get("supplier_name", ""))
        product_name = normalize_text_value(bid.get("product_name", ""))
        unit = normalize_text_value(bid.get("unit", ""))
        quote_date = normalize_text_value(bid.get("quote_date", bid.get("date", "")))
        currency = normalize_text_value(bid.get("currency", "")).upper()
        delivery_time = normalize_text_value(bid.get("delivery_time", ""))
        payment_term = normalize_text_value(bid.get("payment_term", ""))
        valid_until = normalize_text_value(bid.get("valid_until", ""))
        notes = normalize_text_value(bid.get("notes", ""))

        quantity = coerce_numeric_value(
            bid.get("quantity", 0),
            field_name="quantity",
            context=row_context
        )
        unit_price = coerce_numeric_value(
            bid.get("unit_price", 0),
            field_name="unit_price",
            context=row_context
        )
        total_price = coerce_numeric_value(
            bid.get("total_price", 0),
            field_name="total_price",
            context=row_context
        )

        if not supplier_name and not product_name and quantity <= 0 and unit_price <= 0 and total_price <= 0:
            continue

        resolved_total = total_price if total_price > 0 else unit_price * quantity
        normalized_bids.append({
            "supplier_name": supplier_name,
            "product_name": product_name,
            "unit": unit,
            "quantity": quantity,
            "unit_price": round(unit_price, 4),
            "total_price": round(resolved_total, 4),
            "quote_date": quote_date,
            "currency": currency or "USD",
            "delivery_time": delivery_time,
            "payment_term": payment_term,
            "valid_until": valid_until,
            "notes": notes
        })

    return {
        "comparison_id": normalize_text_value(payload.get("comparison_id", "")) or None,
        "name": normalize_text_value(payload.get("name", "")),
        "sourcing_need": normalize_text_value(payload.get("sourcing_need", "")),
        "weighting": normalize_quote_weighting(payload.get("weighting")),
        "source_type": normalize_text_value(payload.get("source_type", "")) or "manual",
        "mode": normalize_text_value(payload.get("mode", "")) or "compare",
        "bids": normalized_bids
    }


def validate_quote_comparison_payload(comparison: dict[str, Any], *, require_name: bool = False) -> None:
    if require_name and not comparison["name"]:
        raise ValueError("Enter a comparison name before evaluating or saving.")
    if not comparison["bids"]:
        raise ValueError("Add at least one supplier offer before evaluating the comparison.")

    for bid in comparison["bids"]:
        if not bid["supplier_name"]:
            raise ValueError("Each offer must include a supplier name.")
        if not bid["product_name"]:
            raise ValueError("Each offer must include a product name.")
        if bid["quantity"] <= 0:
            raise ValueError("Each offer must include a quantity greater than zero.")
        if bid["total_price"] <= 0:
            raise ValueError("Each offer must include a total price greater than zero.")


def build_quote_bids_from_dataframe(dataframe: pd.DataFrame) -> list[dict[str, Any]]:
    bids: list[dict[str, Any]] = []
    optional_fields = set(QUOTE_COMPARE_OPTIONAL_FIELDS)

    for index, row in enumerate(dataframe.iterrows(), start=1):
        _, row_values = row
        row_context = f"uploaded dataframe row {index}"
        supplier_name = normalize_text_value(row_values.get("Supplier", row_values.get("Supplier Name", "")))
        product_name = normalize_text_value(row_values.get("Product Name", ""))
        unit = normalize_text_value(row_values.get("Unit", ""))

        quantity = coerce_numeric_value(
            row_values.get("Quantity", 0),
            field_name="Quantity",
            context=row_context
        )
        unit_price = coerce_numeric_value(
            row_values.get("Unit Price", 0),
            field_name="Unit Price",
            context=row_context
        )
        total_price = (
            coerce_numeric_value(
                row_values.get("Total Price", 0),
                field_name="Total Price",
                context=row_context
            )
            if "Total Price" in optional_fields and "Total Price" in dataframe.columns
            else 0.0
        )

        if not supplier_name and not product_name and quantity <= 0 and unit_price <= 0 and total_price <= 0:
            continue

        resolved_total = total_price if total_price > 0 else quantity * unit_price
        bids.append({
            "supplier_name": supplier_name,
            "product_name": product_name,
            "unit": unit,
            "quantity": round(quantity, 4),
            "unit_price": round(unit_price, 4),
            "total_price": round(resolved_total, 4),
            "quote_date": normalize_text_value(row_values.get("Date", "")),
            "currency": normalize_text_value(row_values.get("Currency", "")).upper() or "USD",
            "delivery_time": normalize_text_value(row_values.get("Delivery Time", "")),
            "payment_term": normalize_text_value(row_values.get("Payment Terms", "")),
            "valid_until": normalize_text_value(row_values.get("Valid Until", "")),
            "notes": normalize_text_value(row_values.get("Notes", ""))
        })

    return bids


def normalize_metric_scores(values: list[float], *, reverse: bool = False) -> list[float]:
    if not values:
        return []
    minimum = min(values)
    maximum = max(values)
    if maximum == minimum:
        return [100.0 for _ in values]
    scores: list[float] = []
    for value in values:
        base = (value - minimum) / (maximum - minimum)
        score = (1 - base) * 100 if reverse else base * 100
        scores.append(round(score, 2))
    return scores


def calculate_quote_comparison(comparison: dict[str, Any]) -> dict[str, Any]:
    validate_quote_comparison_payload(comparison)
    currencies = sorted({bid.get("currency") or "USD" for bid in comparison["bids"]})

    bid_breakdown: list[dict[str, Any]] = []
    for bid in comparison["bids"]:
        bid_breakdown.append({
            **bid,
            "delivery_days": parse_days_from_text(bid.get("delivery_time")),
            "payment_days": parse_payment_term_days(bid.get("payment_term")) or 0
        })

    lowest_price_bid = min(
        bid_breakdown,
        key=lambda item: (item["total_price"], item["supplier_name"].lower())
    )
    fastest_delivery_bid = min(
        bid_breakdown,
        key=lambda item: (
            item["delivery_days"] if item["delivery_days"] is not None else 9999,
            item["supplier_name"].lower()
        )
    )
    best_payment_bid = max(
        bid_breakdown,
        key=lambda item: (item["payment_days"], item["supplier_name"].lower())
    )

    product_groups: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for bid in bid_breakdown:
        product_groups.setdefault((bid["product_name"], bid["unit"]), []).append(bid)

    grouped_products: list[dict[str, Any]] = []
    supplier_wins: dict[str, dict[str, Any]] = {}
    for (product_name, unit), offers in sorted(
        product_groups.items(),
        key=lambda item: (item[0][0].lower(), item[0][1].lower())
    ):
        sorted_offers = sorted(
            offers,
            key=lambda item: (
                item["total_price"],
                item["delivery_days"] if item["delivery_days"] is not None else 9999,
                -item["payment_days"],
                item["supplier_name"].lower()
            )
        )
        best_offer = sorted_offers[0]
        fastest_days = min(
            offer["delivery_days"] if offer["delivery_days"] is not None else 9999
            for offer in sorted_offers
        )
        best_payment_days = max(offer["payment_days"] for offer in sorted_offers)

        for offer in sorted_offers:
            badges: list[str] = []
            if offer is best_offer:
                badges.append("Best Price")
            if offer["delivery_days"] is not None and offer["delivery_days"] == fastest_days:
                badges.append("Fastest Delivery")
            if offer["payment_days"] == best_payment_days:
                badges.append("Best Payment")
            offer["badges"] = badges

        supplier_entry = supplier_wins.setdefault(best_offer["supplier_name"], {"wins": 0, "total_best_value": 0.0})
        supplier_entry["wins"] += 1
        supplier_entry["total_best_value"] += best_offer["total_price"]
        grouped_products.append({
            "product_name": product_name,
            "unit": unit,
            "offer_count": len(sorted_offers),
            "best_offer_supplier": best_offer["supplier_name"],
            "best_offer_value": best_offer["total_price"],
            "offers": sorted_offers
        })

    recommended_supplier_name = min(
        supplier_wins.items(),
        key=lambda item: (-item[1]["wins"], item[1]["total_best_value"], item[0].lower())
    )[0]
    recommended_meta = supplier_wins[recommended_supplier_name]
    delivery_copy = (
        f"{fastest_delivery_bid['delivery_days']} days"
        if fastest_delivery_bid["delivery_days"] is not None
        else "Not provided"
    )
    payment_copy = best_payment_bid["payment_term"] or "Not provided"

    insights = [
        f"{lowest_price_bid['supplier_name']} is the lowest-price offer at {format_currency(lowest_price_bid['total_price'])}.",
        f"{fastest_delivery_bid['supplier_name']} is the fastest delivery option"
        f"{f' at {fastest_delivery_bid['delivery_days']} days' if fastest_delivery_bid['delivery_days'] is not None else ''}.",
        f"{best_payment_bid['supplier_name']} offers the strongest payment position with {best_payment_bid['payment_term'] or 'the most favorable term entered'}.",
        f"{recommended_supplier_name} is recommended because it wins {recommended_meta['wins']} product group"
        f"{'' if recommended_meta['wins'] == 1 else 's'} on best price."
    ]
    if len(currencies) > 1:
        insights.append("Mixed currencies were detected, so price ranking assumes the entered totals are directly comparable.")

    return {
        "summary": {
            "lowest_price_supplier": lowest_price_bid["supplier_name"],
            "lowest_price_value": lowest_price_bid["total_price"],
            "fastest_delivery_supplier": fastest_delivery_bid["supplier_name"],
            "fastest_delivery_value": delivery_copy,
            "best_payment_supplier": best_payment_bid["supplier_name"],
            "best_payment_value": payment_copy,
            "best_overall_supplier": recommended_supplier_name,
            "recommended_supplier": recommended_supplier_name,
            "recommended_reason": (
                f"Wins {recommended_meta['wins']} product group"
                f"{'' if recommended_meta['wins'] == 1 else 's'} on best price, "
                "with delivery and payment terms used as supporting context."
            )
        },
        "currencies": currencies,
        "insights": insights,
        "bids": bid_breakdown,
        "products": grouped_products
    }


def load_recipe_analysis_dataframe() -> pd.DataFrame:
    if not LATEST_RESULTS_PATH.exists():
        raise ValueError("No analyzed dataset is available yet. Please upload and analyze a file first.")

    frame = pd.read_csv(LATEST_RESULTS_PATH)
    if frame.empty:
        raise ValueError("No analyzed dataset is available yet. Please upload and analyze a file first.")

    frame["Product Name"] = frame["Product Name"].fillna("").astype(str).str.strip()
    frame["Unit"] = frame["Unit"].fillna("").astype(str).str.strip()
    frame["Supplier"] = frame["Supplier"].fillna("").astype(str).str.strip()
    frame["Unit Price"] = pd.to_numeric(frame["Unit Price"], errors="coerce")
    frame["Average Price"] = pd.to_numeric(frame.get("Average Price"), errors="coerce")
    frame["Date"] = pd.to_datetime(frame.get("Date"), errors="coerce")
    frame = frame[frame["Product Name"].astype(bool)].copy()

    if frame.empty:
        raise ValueError("No analyzed dataset is available yet. Please upload and analyze a file first.")

    return frame


def build_recipe_product_catalog(frame: pd.DataFrame) -> list[dict[str, Any]]:
    catalog: list[dict[str, Any]] = []
    for product_name, group in frame.groupby("Product Name", sort=True):
        units = sorted({str(unit).strip() for unit in group["Unit"].fillna("").tolist() if str(unit).strip()})
        catalog.append({
            "product_name": str(product_name),
            "units": units
        })
    return catalog


def normalize_recipe_payload(payload: dict[str, Any]) -> dict[str, Any]:
    normalized_ingredients: list[dict[str, Any]] = []
    for ingredient in payload.get("ingredients", []):
        product_name = str(ingredient.get("product_name", "")).strip()
        unit = str(ingredient.get("unit", "")).strip()
        quantity_raw = normalize_request_value(ingredient.get("quantity", 0))
        try:
            quantity = float(quantity_raw)
        except (TypeError, ValueError):
            quantity = 0.0
        if not product_name and not unit and quantity <= 0:
            continue
        normalized_ingredients.append({
            "product_name": product_name,
            "quantity": quantity,
            "unit": unit
        })

    return {
        "recipe_id": str(payload.get("recipe_id") or "").strip() or None,
        "name": str(payload.get("name", "")).strip(),
        "yield_portions": float(normalize_request_value(payload.get("yield_portions", 0)) or 0),
        "pricing_mode": str(payload.get("pricing_mode", "")).strip(),
        "ingredients": normalized_ingredients
    }


def validate_recipe_payload(recipe: dict[str, Any]) -> None:
    if not recipe["name"]:
        raise ValueError("Enter a recipe name before calculating or saving.")
    if recipe["yield_portions"] <= 0:
        raise ValueError("Yield must be greater than zero.")
    if recipe["pricing_mode"] not in RECIPE_PRICING_MODES:
        raise ValueError("Choose a pricing mode before calculating the recipe.")
    if not recipe["ingredients"]:
        raise ValueError("Add at least one ingredient before calculating the recipe.")

    for ingredient in recipe["ingredients"]:
        if not ingredient["product_name"] or not ingredient["unit"] or ingredient["quantity"] <= 0:
            raise ValueError("Each ingredient must include a product, quantity, and unit.")


def resolve_recipe_price(filtered_rows: pd.DataFrame, pricing_mode: str) -> tuple[float, str]:
    if pricing_mode == "latest_price":
        sorted_rows = filtered_rows.sort_values("Date", ascending=False, na_position="last")
        latest_row = sorted_rows.iloc[0]
        return float(latest_row["Unit Price"]), "Latest Price"
    if pricing_mode == "average_price":
        average_series = filtered_rows["Average Price"].dropna()
        if not average_series.empty:
            return float(average_series.mean()), "Average Price"
        return float(filtered_rows["Unit Price"].mean()), "Average Price"
    raise ValueError("Unsupported pricing mode selected.")


def calculate_recipe_cost(recipe: dict[str, Any], frame: pd.DataFrame) -> dict[str, Any]:
    validate_recipe_payload(recipe)
    breakdown: list[dict[str, Any]] = []

    for ingredient in recipe["ingredients"]:
        product_rows = frame[frame["Product Name"] == ingredient["product_name"]].copy()
        if product_rows.empty:
            raise ValueError(f"'{ingredient['product_name']}' was not found in the analyzed purchase dataset.")

        unit_rows = product_rows[product_rows["Unit"] == ingredient["unit"]].copy()
        if unit_rows.empty:
            raise ValueError(
                f"No analyzed pricing was found for {ingredient['product_name']} with unit '{ingredient['unit']}'."
            )

        price_used, pricing_label = resolve_recipe_price(unit_rows, recipe["pricing_mode"])
        ingredient_cost = round(price_used * ingredient["quantity"], 4)
        latest_supplier = (
            unit_rows.sort_values("Date", ascending=False, na_position="last").iloc[0]["Supplier"]
            if not unit_rows.empty else ""
        )

        breakdown.append({
            "product_name": ingredient["product_name"],
            "quantity": round(float(ingredient["quantity"]), 4),
            "unit": ingredient["unit"],
            "price_used": round(price_used, 4),
            "pricing_label": pricing_label,
            "ingredient_cost": round(ingredient_cost, 4),
            "supplier": str(latest_supplier or "").strip() or "N/A"
        })

    total_recipe_cost = round(sum(item["ingredient_cost"] for item in breakdown), 2)
    cost_per_portion = round(total_recipe_cost / recipe["yield_portions"], 2) if recipe["yield_portions"] else 0.0
    main_cost_driver = max(breakdown, key=lambda item: item["ingredient_cost"], default=None)

    return {
        "pricing_mode": recipe["pricing_mode"],
        "pricing_mode_label": RECIPE_PRICING_MODES[recipe["pricing_mode"]],
        "total_recipe_cost": total_recipe_cost,
        "cost_per_portion": cost_per_portion,
        "main_cost_driver": main_cost_driver,
        "ingredient_breakdown": breakdown
    }


def normalize_ai_rows(rows: list[dict[str, Any]] | None = None) -> pd.DataFrame:
    if rows is None:
        if not LATEST_RESULTS_PATH.exists():
            raise ValueError("No analyzed dataset is available yet.")
        source_rows = pd.read_csv(LATEST_RESULTS_PATH).to_dict(orient="records")
    else:
        source_rows = rows

    normalized_rows = []
    for row in source_rows or []:
        product_name = (row.get("Product Name") or row.get("productName") or "").strip()
        supplier = (row.get("Supplier") or row.get("supplier") or "").strip()
        if not product_name or not supplier:
            continue

        normalized_rows.append({
            "Product Name": product_name,
            "Supplier": supplier,
            "Unit": (row.get("Unit") or row.get("purchaseUnit") or "unit" or "").strip() or "unit",
            "Quantity": row.get("Quantity", row.get("quantity", 1)),
            "Unit Price": row.get("Unit Price", row.get("unitPrice", row.get("price", 0))),
            "Total Amount": row.get("Total Amount", row.get("totalAmount", None)),
            "Average Price": row.get("Average Price", row.get("averagePrice", None)),
            "Overpay": row.get("Overpay", row.get("overpay", None)),
            "Savings Opportunity": row.get("Savings Opportunity", row.get("savingsOpportunity", None)),
            "Date": row.get("Date", row.get("date", None)),
            "Status": row.get("Status", row.get("status", "Normal")),
            "Overpay Pct": row.get("Overpay Pct", row.get("overpayPct", None))
        })

    frame = pd.DataFrame(normalized_rows)
    if frame.empty:
        raise ValueError("No analyzed rows are available for AI insights yet.")

    numeric_columns = [
        "Quantity",
        "Unit Price",
        "Total Amount",
        "Average Price",
        "Overpay",
        "Savings Opportunity",
        "Overpay Pct"
    ]
    for column in numeric_columns:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")

    frame["Quantity"] = frame["Quantity"].fillna(1).clip(lower=0)
    frame["Unit Price"] = frame["Unit Price"].fillna(0)
    frame["Date"] = pd.to_datetime(frame["Date"], errors="coerce")
    frame["Product Display"] = frame["Product Name"] + " (" + frame["Unit"].fillna("unit").astype(str) + ")"
    frame["Average Price"] = frame["Average Price"].fillna(
        frame.groupby("Product Display")["Unit Price"].transform("mean")
    )
    frame["Total Amount"] = frame["Total Amount"].fillna(frame["Unit Price"] * frame["Quantity"])
    computed_overpay = (frame["Unit Price"] - frame["Average Price"]).clip(lower=0)
    frame["Overpay"] = frame["Overpay"].fillna(computed_overpay)
    frame["Savings Opportunity"] = frame["Savings Opportunity"].fillna(frame["Overpay"] * frame["Quantity"])
    computed_overpay_pct = (
        (frame["Unit Price"] - frame["Average Price"])
        / frame["Average Price"].replace(0, pd.NA)
    ) * 100
    frame["Overpay Pct"] = frame["Overpay Pct"].fillna(computed_overpay_pct).fillna(0)
    frame["Period"] = frame["Date"].dt.to_period("M")
    return frame


def build_ai_snapshot(frame: pd.DataFrame) -> dict[str, Any]:
    dated_periods = frame["Period"].dropna()
    current_period = dated_periods.max() if not dated_periods.empty else None
    current_frame = frame[frame["Period"] == current_period].copy() if current_period is not None else frame.copy()
    baseline_frame = frame[frame["Period"] != current_period].copy() if current_period is not None else frame.iloc[0:0].copy()
    basis_label = "yearly average" if frame["Period"].nunique(dropna=True) >= 10 else "historical average"

    product_totals = frame.groupby("Product Display", as_index=False).agg(
        total_savings=("Savings Opportunity", "sum"),
        total_overpay=("Overpay", "sum"),
        total_spend=("Total Amount", "sum"),
        avg_overpay_pct=("Overpay Pct", "mean"),
        rows=("Product Display", "size"),
        supplier_count=("Supplier", "nunique")
    )
    current_product = current_frame.groupby("Product Display", as_index=False).agg(
        current_avg=("Unit Price", "mean"),
        current_savings=("Savings Opportunity", "sum"),
        current_overpay=("Overpay", "sum"),
        current_rows=("Product Display", "size")
    )
    baseline_product = baseline_frame.groupby("Product Display", as_index=False).agg(
        baseline_avg=("Unit Price", "mean"),
        baseline_rows=("Product Display", "size")
    )
    product_compare = product_totals.merge(current_product, on="Product Display", how="left").merge(
        baseline_product,
        on="Product Display",
        how="left"
    )
    product_compare["current_avg"] = product_compare["current_avg"].fillna(product_compare["total_spend"] / product_compare["rows"].replace(0, pd.NA))
    product_compare["price_delta"] = product_compare["current_avg"] - product_compare["baseline_avg"]
    product_compare["delta_pct"] = (
        product_compare["price_delta"]
        / product_compare["baseline_avg"].replace(0, pd.NA)
    ) * 100
    product_compare["delta_pct"] = product_compare["delta_pct"].fillna(0)

    supplier_totals = frame.groupby("Supplier", as_index=False).agg(
        total_savings=("Savings Opportunity", "sum"),
        total_spend=("Total Amount", "sum"),
        avg_overpay_pct=("Overpay Pct", "mean"),
        overpay_rows=("Status", lambda values: int((values == "Overpay").sum())),
        row_count=("Supplier", "size")
    )
    current_supplier = current_frame.groupby("Supplier", as_index=False).agg(
        current_avg=("Unit Price", "mean"),
        current_savings=("Savings Opportunity", "sum")
    )
    baseline_supplier = baseline_frame.groupby("Supplier", as_index=False).agg(
        baseline_avg=("Unit Price", "mean")
    )
    supplier_compare = supplier_totals.merge(current_supplier, on="Supplier", how="left").merge(
        baseline_supplier,
        on="Supplier",
        how="left"
    )
    supplier_compare["price_delta"] = supplier_compare["current_avg"] - supplier_compare["baseline_avg"]
    supplier_compare["delta_pct"] = (
        supplier_compare["price_delta"]
        / supplier_compare["baseline_avg"].replace(0, pd.NA)
    ) * 100
    supplier_compare["delta_pct"] = supplier_compare["delta_pct"].fillna(0)
    supplier_compare["risk_score"] = (
        supplier_compare["total_savings"] * 1.35
        + supplier_compare["overpay_rows"] * 8
        + supplier_compare["avg_overpay_pct"].clip(lower=0) * 4
        + supplier_compare["delta_pct"].clip(lower=0) * 5
    )

    supplier_product_risk = current_frame.groupby(["Product Display", "Supplier"], as_index=False).agg(
        supplier_savings=("Savings Opportunity", "sum"),
        supplier_avg_price=("Unit Price", "mean")
    )

    visible_total_spend = float(frame["Total Amount"].sum())
    visible_extra_spend = float(frame["Savings Opportunity"].sum())
    overpay_rows = int((frame["Status"] == "Overpay").sum())
    latest_rows = len(current_frame)
    latest_label = format_period_label(current_period)

    return {
        "frame": frame,
        "current_period": current_period,
        "current_period_label": latest_label,
        "basis_label": basis_label,
        "visible_total_spend": visible_total_spend,
        "visible_extra_spend": visible_extra_spend,
        "overpay_rows": overpay_rows,
        "latest_rows": latest_rows,
        "product_compare": product_compare.sort_values(["current_savings", "total_savings"], ascending=False),
        "supplier_compare": supplier_compare.sort_values(["risk_score", "total_savings"], ascending=False),
        "supplier_product_risk": supplier_product_risk.sort_values("supplier_savings", ascending=False)
    }


def build_insight_response(
    headline: str,
    insights: list[str],
    action: str,
    *,
    period_label: str,
    question_type: str,
    suggestions: list[str]
) -> dict[str, Any]:
    return {
        "headline": headline,
        "insights": insights[:4],
        "recommended_action": action,
        "period_label": period_label,
        "question_type": question_type,
        "suggestions": suggestions[:3]
    }


def resolve_question_type(question: str) -> str:
    prompt = (question or "").strip().lower()
    if any(keyword in prompt for keyword in ["renegotiate", "renegotiation", "what should i renegotiate"]):
        return "renegotiate_first"
    if any(keyword in prompt for keyword in ["supplier increased", "increased prices", "fastest", "price increase"]):
        return "supplier_price_increase"
    if any(keyword in prompt for keyword in ["yearly average", "historical average", "above average"]):
        return "above_baseline"
    if any(keyword in prompt for keyword in ["what changed", "changed this month", "versus"]):
        return "period_change"
    if any(keyword in prompt for keyword in ["spike", "unusual", "price spike"]):
        return "price_spike"
    if any(keyword in prompt for keyword in ["supplier", "pricing risk", "risk"]):
        return "supplier_risk"
    if any(keyword in prompt for keyword in ["margin", "losing money", "hurt", "overpay", "money right now"]):
        return "margin_pressure"
    return "overview"


def answer_margin_pressure(snapshot: dict[str, Any]) -> dict[str, Any]:
    product = snapshot["product_compare"].sort_values(
        ["current_savings", "delta_pct", "total_savings"],
        ascending=False
    ).head(1)
    if product.empty:
        return build_insight_response(
            "No margin pressure is visible in the current slice.",
            ["The current visible rows do not contain recoverable overpay right now."],
            "Broaden the visible selection or upload a dataset with recent purchasing activity.",
            period_label=snapshot["current_period_label"],
            question_type="margin_pressure",
            suggestions=[
                "Which supplier has the highest pricing risk?",
                "What should I renegotiate first?"
            ]
        )

    item = product.iloc[0]
    supplier_risk = snapshot["supplier_product_risk"]
    top_supplier = supplier_risk[supplier_risk["Product Display"] == item["Product Display"]].head(1)
    supplier_line = (
        f"Highest supplier pressure appears under {top_supplier.iloc[0]['Supplier']} at {format_currency(top_supplier.iloc[0]['supplier_savings'])} of excess spend."
        if not top_supplier.empty else
        "Supplier concentration is limited in the current visible slice."
    )
    return build_insight_response(
        f"{item['Product Display']} shows the strongest margin pressure in {snapshot['current_period_label']}.",
        [
            f"Visible recoverable spend is {format_currency(coalesce_number(item['current_savings'], item['total_savings']))}.",
            f"Average price is {format_percent(item['delta_pct'])} above the {snapshot['basis_label']}." if pd.notna(item["baseline_avg"]) else "There is not enough historical baseline to compare against prior periods.",
            supplier_line,
            f"{int(item['rows'])} visible purchase rows contribute to this signal."
        ],
        f"Review {item['Product Display']} first and compare current supplier pricing against the baseline before the next purchasing cycle.",
        period_label=snapshot["current_period_label"],
        question_type="margin_pressure",
        suggestions=[
            "What should I renegotiate first?",
            "Which supplier has the highest pricing risk?",
            "Which items show unusual price spikes?"
        ]
    )


def answer_supplier_price_increase(snapshot: dict[str, Any]) -> dict[str, Any]:
    supplier = snapshot["supplier_compare"].sort_values(
        ["delta_pct", "total_savings"],
        ascending=False
    ).head(1)
    if supplier.empty or supplier.iloc[0]["delta_pct"] <= 0:
        return build_insight_response(
            "No supplier is showing a clear price acceleration in the current slice.",
            [
                "Either the visible period is stable or there is not enough dated history for a month-over-month comparison."
            ],
            "Broaden the date range to compare current prices against a stronger historical baseline.",
            period_label=snapshot["current_period_label"],
            question_type="supplier_price_increase",
            suggestions=[
                "What changed this month versus my yearly average?",
                "Which supplier has the highest pricing risk?"
            ]
        )

    item = supplier.iloc[0]
    return build_insight_response(
        f"{item['Supplier']} shows the fastest visible price increase in {snapshot['current_period_label']}.",
        [
            f"Average unit price is {format_percent(item['delta_pct'])} above the {snapshot['basis_label']}.",
            f"Visible excess spend tied to this supplier is {format_currency(item['total_savings'])}.",
            f"{int(item['overpay_rows'])} visible rows are currently flagged as overpay.",
            f"Visible spend under this supplier is {format_currency(item['total_spend'])}."
        ],
        f"Review {item['Supplier']} first, then compare its current pricing against the strongest alternative suppliers in the same product set.",
        period_label=snapshot["current_period_label"],
        question_type="supplier_price_increase",
        suggestions=[
            "Which supplier has the highest pricing risk?",
            "What should I renegotiate first?"
        ]
    )


def answer_renegotiate_first(snapshot: dict[str, Any]) -> dict[str, Any]:
    ranked = snapshot["product_compare"].copy()
    ranked["priority_score"] = (
        ranked["current_savings"].fillna(ranked["total_savings"]) * 1.4
        + ranked["delta_pct"].clip(lower=0) * 6
        + ranked["supplier_count"] * 3
    )
    item = ranked.sort_values("priority_score", ascending=False).head(1)
    if item.empty:
        return answer_margin_pressure(snapshot)

    winner = item.iloc[0]
    return build_insight_response(
        f"{winner['Product Display']} is the first renegotiation target right now.",
        [
            f"Priority score is {winner['priority_score']:.1f} based on excess spend, price drift, and supplier spread.",
            f"Recoverable spend is {format_currency(coalesce_number(winner['current_savings'], winner['total_savings']))}.",
            f"Current pricing is {format_percent(winner['delta_pct'])} above the {snapshot['basis_label']}." if pd.notna(winner["baseline_avg"]) else "Historical comparison is limited, so the score is being driven mostly by current excess spend.",
            f"{int(winner['supplier_count'])} supplier comparison points are available."
        ],
        f"Use {winner['Product Display']} as the first negotiation brief, then work down the next-highest savings opportunities.",
        period_label=snapshot["current_period_label"],
        question_type="renegotiate_first",
        suggestions=[
            "Which product hurt my margin the most this month?",
            "Which supplier increased prices the fastest?"
        ]
    )


def answer_above_baseline(snapshot: dict[str, Any]) -> dict[str, Any]:
    item = snapshot["product_compare"].sort_values("delta_pct", ascending=False).head(1)
    if item.empty or item.iloc[0]["delta_pct"] <= 0:
        return build_insight_response(
            "No product is currently sitting above its visible baseline.",
            ["The current slice does not show a positive variance against the available historical average."],
            "Review a broader date range if you want a deeper baseline comparison.",
            period_label=snapshot["current_period_label"],
            question_type="above_baseline",
            suggestions=[
                "What changed this month versus my yearly average?",
                "Which items show unusual price spikes?"
            ]
        )

    winner = item.iloc[0]
    return build_insight_response(
        f"{winner['Product Display']} is running furthest above its {snapshot['basis_label']}.",
        [
            f"Current average unit price is {format_currency(winner['current_avg'])}.",
            f"That is {format_percent(winner['delta_pct'])} above the baseline average of {format_currency(winner['baseline_avg'])}.",
            f"Visible savings opportunity already totals {format_currency(coalesce_number(winner['current_savings'], winner['total_savings']))}.",
            f"{int(winner['rows'])} visible rows support the signal."
        ],
        f"Treat {winner['Product Display']} as a watchlist product and compare the latest purchases against your baseline target price before reordering.",
        period_label=snapshot["current_period_label"],
        question_type="above_baseline",
        suggestions=[
            "Which items show unusual price spikes?",
            "What should I renegotiate first?"
        ]
    )


def answer_period_change(snapshot: dict[str, Any]) -> dict[str, Any]:
    changed = snapshot["product_compare"].sort_values(["delta_pct", "current_savings"], ascending=False).head(1)
    if changed.empty:
        return answer_overview(snapshot)

    item = changed.iloc[0]
    return build_insight_response(
        f"{item['Product Display']} shows the sharpest shift in {snapshot['current_period_label']}.",
        [
            f"Current average price is {format_currency(item['current_avg'])}.",
            f"Variance versus the {snapshot['basis_label']} is {format_percent(item['delta_pct'])}.",
            f"Visible excess spend in the current slice is {format_currency(coalesce_number(item['current_savings'], item['total_savings']))}.",
            f"Current period coverage includes {int(coalesce_number(item['current_rows'], 0))} visible rows."
        ],
        f"Use {item['Product Display']} as the lead story for this period review, then validate whether the shift is supplier-specific or market-wide.",
        period_label=snapshot["current_period_label"],
        question_type="period_change",
        suggestions=[
            "Which supplier increased prices the fastest?",
            "Which products are above yearly average price?"
        ]
    )


def answer_price_spike(snapshot: dict[str, Any]) -> dict[str, Any]:
    spiking = snapshot["product_compare"].sort_values(["delta_pct", "current_avg"], ascending=False).head(1)
    if spiking.empty or spiking.iloc[0]["delta_pct"] <= 0:
        return build_insight_response(
            "No unusual price spike is standing out in the current slice.",
            ["The visible price pattern looks relatively stable against the available baseline."],
            "If you expect volatility, widen the visible date range and rerun the comparison.",
            period_label=snapshot["current_period_label"],
            question_type="price_spike",
            suggestions=[
                "What changed this month versus my yearly average?",
                "Which supplier has the highest pricing risk?"
            ]
        )

    winner = spiking.iloc[0]
    return build_insight_response(
        f"{winner['Product Display']} shows the clearest unusual price spike right now.",
        [
            f"Current average price is {format_percent(winner['delta_pct'])} above the {snapshot['basis_label']}.",
            f"The latest average is {format_currency(winner['current_avg'])} versus a baseline of {format_currency(winner['baseline_avg'])}.",
            f"Visible recoverable spend tied to the spike is {format_currency(coalesce_number(winner['current_savings'], winner['total_savings']))}.",
            f"The product appears across {int(winner['supplier_count'])} supplier comparison points."
        ],
        f"Flag {winner['Product Display']} for immediate price verification and validate whether the spike is coming from one supplier or across the market.",
        period_label=snapshot["current_period_label"],
        question_type="price_spike",
        suggestions=[
            "Which supplier increased prices the fastest?",
            "What should I renegotiate first?"
        ]
    )


def answer_supplier_risk(snapshot: dict[str, Any]) -> dict[str, Any]:
    supplier = snapshot["supplier_compare"].sort_values(["risk_score", "total_savings"], ascending=False).head(1)
    if supplier.empty:
        return answer_overview(snapshot)

    item = supplier.iloc[0]
    return build_insight_response(
        f"{item['Supplier']} carries the highest pricing risk in the current view.",
        [
            f"Risk score is {item['risk_score']:.1f}, driven by excess spend, overpay frequency, and price drift.",
            f"Visible recoverable spend tied to this supplier is {format_currency(item['total_savings'])}.",
            f"Average pricing sits {format_percent(item['delta_pct'])} above the {snapshot['basis_label']}." if pd.notna(item["baseline_avg"]) else "Historical supplier comparison is limited, so the risk score is being driven mostly by current overpay concentration.",
            f"{int(item['overpay_rows'])} visible rows are currently flagged as overpay."
        ],
        f"Prioritize a supplier review with {item['Supplier']} and compare its latest pricing against both baseline and alternate supplier quotes.",
        period_label=snapshot["current_period_label"],
        question_type="supplier_risk",
        suggestions=[
            "Which supplier increased prices the fastest?",
            "What should I renegotiate first?"
        ]
    )


def answer_overview(snapshot: dict[str, Any]) -> dict[str, Any]:
    product = snapshot["product_compare"].sort_values(["current_savings", "total_savings"], ascending=False).head(1)
    supplier = snapshot["supplier_compare"].sort_values(["risk_score", "total_savings"], ascending=False).head(1)
    product_name = product.iloc[0]["Product Display"] if not product.empty else "the current product mix"
    supplier_name = supplier.iloc[0]["Supplier"] if not supplier.empty else "the visible supplier set"
    return build_insight_response(
        f"{product_name} and {supplier_name} are driving the clearest purchasing pressure right now.",
        [
            f"Visible recoverable spend totals {format_currency(snapshot['visible_extra_spend'])}.",
            f"{snapshot['overpay_rows']} visible row{' is' if snapshot['overpay_rows'] == 1 else 's are'} currently flagged as overpay.",
            f"The current view covers {snapshot['latest_rows']} row{'s' if snapshot['latest_rows'] != 1 else ''} in {snapshot['current_period_label']}.",
            f"Visible spend in scope is {format_currency(snapshot['visible_total_spend'])}."
        ],
        "Start with the top margin-pressure product and the highest-risk supplier, then move into renegotiation targets from there.",
        period_label=snapshot["current_period_label"],
        question_type="overview",
        suggestions=[
            "Which product hurt my margin the most this month?",
            "Which supplier has the highest pricing risk?",
            "What should I renegotiate first?"
        ]
    )


def build_ai_answer(question: str, rows: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    snapshot = build_ai_snapshot(normalize_ai_rows(rows))
    question_type = resolve_question_type(question)
    handlers = {
        "margin_pressure": answer_margin_pressure,
        "supplier_price_increase": answer_supplier_price_increase,
        "renegotiate_first": answer_renegotiate_first,
        "above_baseline": answer_above_baseline,
        "period_change": answer_period_change,
        "price_spike": answer_price_spike,
        "supplier_risk": answer_supplier_risk,
        "overview": answer_overview
    }
    answer = handlers[question_type](snapshot)
    answer["question"] = question.strip()
    answer["source_row_count"] = len(snapshot["frame"])
    return answer


def analyze_dataframe(df: pd.DataFrame, *, source_name: str) -> dict:
    required_columns = REQUIRED_ANALYSIS_FIELDS
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")

    working_df = df.copy()
    working_df["Product Name"] = working_df["Product Name"].astype(str).str.strip()
    working_df["Supplier"] = working_df["Supplier"].astype(str).str.strip()
    working_df["Unit"] = working_df["Unit"].fillna("unit").astype(str).str.strip().replace("", "unit")
    working_df["Quantity"] = pd.to_numeric(working_df["Quantity"], errors="coerce")
    working_df["Unit Price"] = pd.to_numeric(working_df["Unit Price"], errors="coerce")
    working_df["Date"] = pd.to_datetime(working_df["Date"], errors="coerce")
    working_df = working_df.dropna(subset=["Product Name", "Supplier", "Unit Price", "Quantity", "Date"])

    if working_df.empty:
        raise ValueError("No valid price data found in the uploaded file.")

    working_df["Quantity"] = working_df["Quantity"].clip(lower=0)
    working_df["Date"] = working_df["Date"].dt.strftime("%Y-%m-%d")
    grouping_columns = ["Product Name", "Unit"]
    working_df["Average Price"] = working_df.groupby(grouping_columns)["Unit Price"].transform("mean")
    working_df["Overpay Pct"] = ((working_df["Unit Price"] - working_df["Average Price"]) / working_df["Average Price"].replace(0, pd.NA)) * 100
    working_df["Overpay Pct"] = working_df["Overpay Pct"].fillna(0)
    working_df["Overpay"] = (working_df["Unit Price"] - working_df["Average Price"]).clip(lower=0)
    working_df["Savings Opportunity"] = working_df["Overpay"] * working_df["Quantity"]
    working_df["Total Amount"] = working_df["Unit Price"] * working_df["Quantity"]
    working_df["Product Key"] = working_df["Product Name"] + " | " + working_df["Unit"]
    working_df["Product Display"] = working_df["Product Name"] + " (" + working_df["Unit"] + ")"

    def get_status(value):
        if value >= 5:
            return "Overpay"
        if value <= -5:
            return "Good Deal"
        return "Normal"

    working_df["Status"] = working_df["Overpay Pct"].apply(get_status)

    total_rows = len(working_df)
    overpay_items = int((working_df["Status"] == "Overpay").sum())
    estimated_extra_spend = round(working_df["Savings Opportunity"].sum(), 2)
    total_spend = round(working_df["Total Amount"].sum(), 2)
    overpay_rate = round((overpay_items / total_rows) * 100, 2) if total_rows else 0

    result_columns = [
        "Product Name",
        "Supplier",
        "Unit",
        "Quantity",
        "Unit Price",
        "Total Amount",
        "Average Price",
        "Overpay",
        "Savings Opportunity",
        "Date",
        "Status",
        "Overpay Pct",
        "Product Key",
        "Product Display"
    ]

    result_df = working_df[result_columns].copy()
    result_df["Quantity"] = result_df["Quantity"].round(2)
    result_df["Unit Price"] = result_df["Unit Price"].round(2)
    result_df["Total Amount"] = result_df["Total Amount"].round(2)
    result_df["Average Price"] = result_df["Average Price"].round(2)
    result_df["Overpay"] = result_df["Overpay"].round(2)
    result_df["Savings Opportunity"] = result_df["Savings Opportunity"].round(2)
    result_df["Overpay Pct"] = result_df["Overpay Pct"].round(2)

    result_df.to_csv(LATEST_RESULTS_PATH, index=False)
    rows = result_df.to_dict(orient="records")

    top_overpay = (
        result_df[result_df["Status"] == "Overpay"]
        .sort_values("Savings Opportunity", ascending=False)
        .head(5)
    )

    savings_by_product = (
        result_df.groupby("Product Display", as_index=False)["Savings Opportunity"]
        .sum()
        .sort_values("Savings Opportunity", ascending=False)
        .head(5)
    )

    status_counts = result_df["Status"].value_counts().to_dict()

    best_saving_supplier_df = (
        result_df.groupby("Supplier", as_index=False)["Savings Opportunity"]
        .sum()
        .sort_values("Savings Opportunity", ascending=False)
    )
    best_saving_supplier = (
        best_saving_supplier_df.iloc[0]["Supplier"]
        if not best_saving_supplier_df.empty else "N/A"
    )

    highest_risk_product_df = (
        result_df[result_df["Status"] == "Overpay"]
        .groupby("Product Display", as_index=False)["Savings Opportunity"]
        .sum()
        .sort_values("Savings Opportunity", ascending=False)
    )
    highest_risk_product = (
        highest_risk_product_df.iloc[0]["Product Display"]
        if not highest_risk_product_df.empty else "N/A"
    )

    insights = []
    if highest_risk_product != "N/A":
        insights.append(f"Highest savings risk is concentrated in {highest_risk_product}.")
    if best_saving_supplier != "N/A":
        insights.append(f"Best savings opportunity is linked to supplier comparison against {best_saving_supplier}.")
    if overpay_rate > 0:
        insights.append(f"{overpay_rate}% of analyzed rows are currently flagged as overpay.")
    if estimated_extra_spend > 0:
        insights.append(f"Estimated extra spend identified: ${estimated_extra_spend:.2f}.")

    charts = {
        "top_overpay_labels": top_overpay["Product Display"].tolist(),
        "top_overpay_values": top_overpay["Savings Opportunity"].round(2).tolist(),
        "savings_labels": savings_by_product["Product Display"].tolist(),
        "savings_values": savings_by_product["Savings Opportunity"].round(2).tolist(),
        "status_labels": list(status_counts.keys()),
        "status_values": list(status_counts.values())
    }

    return {
        "filename": source_name,
        "summary": {
            "total_rows": total_rows,
            "overpay_items": overpay_items,
            "estimated_extra_spend": estimated_extra_spend,
            "total_spend": total_spend,
            "overpay_rate": overpay_rate,
            "best_saving_supplier": best_saving_supplier,
            "highest_risk_product": highest_risk_product
        },
        "has_unit": True,
        "rows": rows,
        "insights": insights,
        "charts_json": json.dumps(charts)
    }


def build_home_redirect(**params) -> RedirectResponse:
    filtered_params = {
        key: value
        for key, value in params.items()
        if value not in (None, "", False)
    }
    query_string = urlencode(filtered_params)
    target = "/" if not query_string else f"/?{query_string}"
    return RedirectResponse(url=target, status_code=303)


def load_latest_analysis_context(*, source_name: str | None = None, demo_mode: bool = False) -> dict:
    if not LATEST_RESULTS_PATH.exists():
        raise ValueError("No results available yet. Please upload a file first.")

    latest_results_df = pd.read_csv(LATEST_RESULTS_PATH)
    analysis_context = analyze_dataframe(
        latest_results_df,
        source_name=source_name or "Previous analysis"
    )
    if demo_mode:
        analysis_context["demo_mode"] = True
    analysis_context["persisted_analysis"] = True
    return analysis_context


def build_page_context(
    request: Request,
    *,
    active_view: str = "analyzer"
) -> dict[str, Any]:
    context: dict[str, Any] = {"request": request, "active_view": active_view}
    error = request.query_params.get("error")
    source_name = request.query_params.get("filename")
    demo_mode = parse_bool_flag(request.query_params.get("demo_mode"))

    if error:
        context["error"] = error

    if LATEST_RESULTS_PATH.exists():
        try:
            context.update(
                load_latest_analysis_context(
                    source_name=source_name,
                    demo_mode=demo_mode
                )
            )
        except Exception as exc:
            logger.exception("Failed to load latest analysis for %s view", active_view)
            context["error"] = str(exc)

    return context


def wants_json_response(request: Request) -> bool:
    accept_header = (request.headers.get("accept") or "").lower()
    requested_with = (request.headers.get("x-requested-with") or "").lower()
    return "application/json" in accept_header or requested_with == "xmlhttprequest"


def create_app() -> FastAPI:
    app = FastAPI()
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
    app.state.templates = templates

    @app.on_event("startup")
    async def log_startup_state():
        logger.info("Starting price analyzer app")
        logger.info("Base directory: %s", BASE_DIR)
        logger.info("Templates directory verified: %s", TEMPLATES_DIR)
        logger.info("Static directory mounted: %s", STATIC_DIR)
        ensure_codes_file()
        logger.info("Access codes file ready: %s", CODES_PATH)
        ensure_recipes_file()
        logger.info("Recipes file ready: %s", RECIPES_PATH)
        ensure_quote_comparisons_file()
        logger.info("Quote comparisons file ready: %s", QUOTE_COMPARISONS_PATH)
        try:
            templates.get_template(INDEX_TEMPLATE)
            logger.info("Template preflight passed: %s", INDEX_TEMPLATE)
        except Exception:
            logger.exception("Template preflight failed during startup")
            raise

    @app.get("/")
    def home(request: Request):
        return safe_template_response(
            request,
            INDEX_TEMPLATE,
            build_page_context(request, active_view="analyzer")
        )

    @app.get("/recipes")
    def recipes_view(request: Request):
        return safe_template_response(
            request,
            INDEX_TEMPLATE,
            build_page_context(request, active_view="recipes")
        )

    @app.get("/guide")
    def guide_view(request: Request):
        return safe_template_response(
            request,
            INDEX_TEMPLATE,
            build_page_context(request, active_view="guide")
        )

    @app.get("/quote-compare")
    def quote_compare_view(request: Request):
        return safe_template_response(
            request,
            INDEX_TEMPLATE,
            build_page_context(request, active_view="quote_compare")
        )

    @app.post("/validate-code")
    def validate_code(payload: AccessSessionPayload):
        logger.info(
            "POST /validate-code received | code=%s | incoming session_id=%s",
            normalize_access_code(payload.code),
            normalize_session_id(payload.session_id)
        )
        validation_result = validate_access_code_session(payload.code, payload.session_id)
        logger.info(
            "POST /validate-code response | code=%s | success=%s | session_id=%s | message=%s",
            validation_result.get("code"),
            validation_result.get("success"),
            validation_result.get("session_id"),
            validation_result.get("message")
        )
        return validation_result

    @app.post("/logout")
    def logout(payload: AccessSessionPayload):
        success = logout_access_code_session(payload.code, payload.session_id)
        return {"success": success}

    @app.get("/generate-code")
    def generate_code():
        new_code = create_unique_access_code()
        return {
            "code": new_code,
            "active": True,
            "session_id": None
        }

    @app.get("/download-sample")
    def download_sample():
        sample_df = build_sample_dataframe()
        output = dataframe_to_excel_stream(sample_df, "Sample Data")

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=sample_data.xlsx"}
        )

    @app.get("/download-sample-csv")
    def download_sample_csv():
        sample_df = build_sample_dataframe()
        output = io.StringIO()
        sample_df.to_csv(output, index=False)

        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=sample_data.csv"}
        )

    @app.get("/download-sample-excel")
    def download_sample_excel():
        return download_sample()

    @app.get("/quote-compare/download-sample-csv")
    def download_quote_compare_sample_csv():
        sample_df = build_quote_compare_sample_dataframe()
        output = io.StringIO()
        sample_df.to_csv(output, index=False)

        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=quote_compare_sample.csv"}
        )

    @app.get("/quote-compare/download-sample-excel")
    def download_quote_compare_sample_excel():
        sample_df = build_quote_compare_sample_dataframe()
        output = dataframe_to_excel_stream(sample_df, "Quote Compare Sample")

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=quote_compare_sample.xlsx"}
        )

    @app.get("/download-results")
    def download_results():
        if LATEST_RESULTS_PATH.exists():
            return FileResponse(
                str(LATEST_RESULTS_PATH),
                media_type="text/csv",
                filename="price_analysis_results.csv"
            )
        return build_home_redirect(error="No results available yet. Please upload a file first.")

    @app.get("/download-results-excel")
    def download_results_excel():
        if not LATEST_RESULTS_PATH.exists():
            return build_home_redirect(error="No results available yet. Please upload a file first.")

        result_df = pd.read_csv(LATEST_RESULTS_PATH)
        output = dataframe_to_excel_stream(result_df, "Price Analysis Results")

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=price_analysis_results.xlsx"}
        )

    @app.post("/upload")
    async def upload_file(request: Request, file: UploadFile = File(...)):
        filename = file.filename or ""
        json_response = wants_json_response(request)

        try:
            df = read_uploaded_dataframe(file)
        except ValueError as exc:
            error_message = str(exc)
            if json_response:
                return JSONResponse(
                    {"success": False, "message": error_message},
                    status_code=400
                )
            return build_home_redirect(error=error_message)
        except Exception:
            logger.exception("Failed to read uploaded file: %s", filename)
            error_message = "The file could not be read. Please upload a valid CSV or Excel file (.csv, .xlsx, or .xls)."
            if json_response:
                return JSONResponse(
                    {"success": False, "message": error_message},
                    status_code=400
                )
            return build_home_redirect(
                error=error_message
            )

        try:
            review_payload = build_mapping_review_payload(df, filename=filename)
            mapped_df = apply_column_mapping(df, review_payload["mapping"])
            analysis_context = analyze_dataframe(mapped_df, source_name=filename)
        except ValueError as exc:
            if json_response:
                return JSONResponse(
                    {"success": False, "message": str(exc)},
                    status_code=400
                )
            return build_home_redirect(error=str(exc))

        if json_response:
            return JSONResponse({
                "success": True,
                **analysis_context
            })

        return build_home_redirect(
            results="1",
            filename=filename
        )

    @app.post("/upload/inspect")
    async def inspect_upload_file(file: UploadFile = File(...)):
        filename = file.filename or ""

        try:
            df = read_uploaded_dataframe(file)
        except ValueError as exc:
            return JSONResponse(
                {"success": False, "message": str(exc)},
                status_code=400
            )
        except Exception:
            logger.exception("Failed to inspect uploaded file: %s", filename)
            return JSONResponse(
                {
                    "success": False,
                    "message": "The file could not be read. Please upload a valid CSV or Excel file (.csv, .xlsx, or .xls)."
                },
                status_code=400
            )

        payload = {
            "success": True,
            **build_mapping_review_payload(df, filename=filename)
        }
        logger.info(
            "[upload debug] /upload/inspect response for %s: keys=%s",
            filename,
            sorted(payload.keys())
        )
        return JSONResponse(payload)

    @app.post("/upload/confirm")
    async def confirm_upload_file(
        file: UploadFile = File(...),
        mappings: str = Form(...)
    ):
        filename = file.filename or ""

        try:
            df = read_uploaded_dataframe(file)
        except ValueError as exc:
            return JSONResponse(
                {"success": False, "message": str(exc)},
                status_code=400
            )
        except Exception:
            logger.exception("Failed to read uploaded file for confirmed mapping: %s", filename)
            return JSONResponse(
                {
                    "success": False,
                    "message": "The file could not be read. Please upload a valid CSV or Excel file (.csv, .xlsx, or .xls)."
                },
                status_code=400
            )

        try:
            parsed_mapping = json.loads(mappings)
            if not isinstance(parsed_mapping, dict):
                raise ValueError
        except ValueError:
            return JSONResponse(
                {"success": False, "message": "The selected column mappings could not be understood. Please review them and try again."},
                status_code=400
            )

        try:
            mapped_df = apply_column_mapping(
                df,
                {field_name: parsed_mapping.get(field_name) for field_name in REQUIRED_ANALYSIS_FIELDS}
            )
            analysis_context = analyze_dataframe(mapped_df, source_name=filename)
        except ValueError as exc:
            return JSONResponse(
                {"success": False, "message": str(exc)},
                status_code=400
            )

        return JSONResponse({
            "success": True,
            **analysis_context
        })

    @app.post("/demo-data")
    def demo_data(request: Request):
        try:
            analyze_dataframe(build_sample_dataframe(), source_name="Demo dataset")
        except ValueError as exc:
            logger.exception("Demo data analysis failed")
            return build_home_redirect(error=str(exc))

        return build_home_redirect(
            results="1",
            filename="Demo dataset",
            demo_mode="1"
        )

    @app.post("/clear")
    def clear_analysis():
        if LATEST_RESULTS_PATH.exists():
            LATEST_RESULTS_PATH.unlink()
            logger.info("Cleared persisted analysis at %s", LATEST_RESULTS_PATH)
        return build_home_redirect()

    @app.post("/ask-data")
    def ask_data(payload: AskDataPayload):
        question = (payload.question or "").strip()
        if not question:
            return JSONResponse(
                {"success": False, "message": "Please enter a question before running AI insights."},
                status_code=400
            )

        try:
            answer = build_ai_answer(question, payload.rows)
        except ValueError as exc:
            return JSONResponse(
                {"success": False, "message": str(exc)},
                status_code=400
            )
        except Exception:
            logger.exception("Failed to generate AI data answer")
            return JSONResponse(
                {"success": False, "message": "AI insights could not be generated from the current dataset."},
                status_code=500
            )

        return JSONResponse({
            "success": True,
            **answer
        })

    @app.post("/guide/ask")
    def guide_ask(payload: GuideAskPayload):
        question = (payload.question or "").strip()
        if not question:
            return JSONResponse(
                {"success": False, "message": "Enter a product-help question first."},
                status_code=400
            )

        answer = build_guide_response(question)
        return JSONResponse({
            "success": True,
            **answer
        })

    @app.get("/recipes/bootstrap")
    def recipes_bootstrap():
        try:
            frame = load_recipe_analysis_dataframe()
        except ValueError as exc:
            return JSONResponse({"success": False, "message": str(exc)}, status_code=400)

        recipes = load_recipes_store().get("recipes", [])
        return JSONResponse({
            "success": True,
            "pricing_modes": [
                {"value": value, "label": label}
                for value, label in RECIPE_PRICING_MODES.items()
            ],
            "products": build_recipe_product_catalog(frame),
            "recipes": recipes
        })

    @app.post("/recipes/calculate")
    def calculate_recipe(payload: RecipePayload):
        try:
            frame = load_recipe_analysis_dataframe()
            normalized_recipe = normalize_recipe_payload(payload.model_dump())
            calculation = calculate_recipe_cost(normalized_recipe, frame)
        except ValueError as exc:
            return JSONResponse({"success": False, "message": str(exc)}, status_code=400)

        return JSONResponse({
            "success": True,
            "recipe": normalized_recipe,
            "calculation": calculation
        })

    @app.post("/recipes/save")
    def save_recipe(payload: RecipePayload):
        try:
            frame = load_recipe_analysis_dataframe()
            normalized_recipe = normalize_recipe_payload(payload.model_dump())
            calculation = calculate_recipe_cost(normalized_recipe, frame)
        except ValueError as exc:
            return JSONResponse({"success": False, "message": str(exc)}, status_code=400)

        now = datetime.now(timezone.utc).isoformat()
        store = load_recipes_store()
        recipes = store.get("recipes", [])
        recipe_id = normalized_recipe["recipe_id"] or str(uuid.uuid4())
        existing_recipe = next((recipe for recipe in recipes if recipe.get("recipe_id") == recipe_id), None)

        saved_recipe = {
            "recipe_id": recipe_id,
            "name": normalized_recipe["name"],
            "yield_portions": normalized_recipe["yield_portions"],
            "pricing_mode": normalized_recipe["pricing_mode"],
            "ingredients": normalized_recipe["ingredients"],
            "updated_at": now,
            "created_at": existing_recipe.get("created_at") if existing_recipe else now
        }

        if existing_recipe:
            recipes = [saved_recipe if recipe.get("recipe_id") == recipe_id else recipe for recipe in recipes]
        else:
            recipes.append(saved_recipe)

        store["recipes"] = recipes
        save_recipes_store(store)

        return JSONResponse({
            "success": True,
            "recipe": saved_recipe,
            "calculation": calculation,
            "recipes": recipes,
            "message": f"Recipe saved: {saved_recipe['name']}"
        })

    @app.post("/recipes/delete")
    def delete_recipe(payload: RecipeDeletePayload):
        recipe_id = str(payload.recipe_id or "").strip()
        if not recipe_id:
            return JSONResponse({"success": False, "message": "Choose a saved recipe to delete."}, status_code=400)

        store = load_recipes_store()
        recipes = store.get("recipes", [])
        existing_recipe = next((recipe for recipe in recipes if recipe.get("recipe_id") == recipe_id), None)
        if not existing_recipe:
            return JSONResponse({"success": False, "message": "The selected recipe could not be found."}, status_code=404)

        updated_recipes = [recipe for recipe in recipes if recipe.get("recipe_id") != recipe_id]
        store["recipes"] = updated_recipes
        save_recipes_store(store)

        return JSONResponse({
            "success": True,
            "deleted_recipe_id": recipe_id,
            "recipes": updated_recipes,
            "message": f"Deleted recipe: {existing_recipe.get('name', 'Recipe')}"
        })

    @app.get("/quote-compare/bootstrap")
    def quote_compare_bootstrap(session_id: str | None = None):
        store = load_quote_comparisons_store()
        comparisons = store.get("comparisons", [])
        active_session = validate_quote_compare_active_session(load_quote_compare_active_session(session_id))
        return JSONResponse({
            "success": True,
            "comparisons": comparisons,
            "active_session": active_session
        })

    @app.post("/quote-compare/demo-data")
    def quote_compare_demo_data():
        normalized_comparison = normalize_quote_comparison_payload({
            "name": "Demo Supplier Offers",
            "sourcing_need": "Starter packaging comparison",
            "bids": build_quote_bids_from_dataframe(build_quote_compare_sample_dataframe())
        })
        evaluation = calculate_quote_comparison(normalized_comparison)
        return JSONResponse({
            "success": True,
            "comparison": normalized_comparison,
            "evaluation": evaluation,
            "message": "Loaded demo supplier offers."
        })

    @app.post("/quote-compare/upload/inspect")
    async def inspect_quote_compare_upload(file: UploadFile = File(...)):
        filename = file.filename or ""

        try:
            df = read_uploaded_dataframe(file)
            columns = [str(column) for column in df.columns]
            required_detection = detect_column_mappings(
                columns,
                required_fields=QUOTE_COMPARE_REQUIRED_FIELDS,
                field_synonyms=QUOTE_COMPARE_FIELD_SYNONYMS
            )
            optional_detection = detect_column_mappings(
                columns,
                required_fields=QUOTE_COMPARE_OPTIONAL_FIELDS,
                field_synonyms=QUOTE_COMPARE_FIELD_SYNONYMS
            )
        except ValueError as exc:
            return JSONResponse({"success": False, "message": str(exc)}, status_code=400)
        except Exception:
            logger.exception("Failed to inspect quote compare upload: %s", filename)
            return JSONResponse(
                {
                    "success": False,
                    "message": "The file could not be read. Please upload a valid CSV or Excel file (.csv, .xlsx, or .xls)."
                },
                status_code=400
            )

        optional_reviews = []
        used_headers = {value for value in required_detection["mapping"].values() if value}
        for review in optional_detection["field_reviews"]:
            detected_column = review.get("detected_column")
            if detected_column in used_headers:
                review = {
                    **review,
                    "detected_column": None,
                    "score": 0,
                    "match_quality": "missing"
                }
            elif detected_column:
                used_headers.add(detected_column)
            optional_reviews.append(review)

        payload = {
            "session_id": str(uuid.uuid4()),
            "filename": filename,
            "required_fields": QUOTE_COMPARE_REQUIRED_FIELDS,
            "optional_fields": QUOTE_COMPARE_OPTIONAL_FIELDS,
            "message": "We detected likely supplier-offer fields from your upload.",
            "review_message": "Review required and optional column matches before moving into quote analysis.",
            "mapping": {
                **required_detection["mapping"],
                **{
                    review["field"]: review.get("detected_column")
                    for review in optional_reviews
                }
            },
            "field_reviews": required_detection["field_reviews"] + optional_reviews,
            "matched_fields": required_detection["matched_fields"],
            "missing_fields": required_detection["missing_fields"],
            "optional_columns": required_detection["optional_columns"],
            "headers": columns
        }

        save_quote_compare_active_session(
            payload["session_id"],
            {
                "session_id": payload["session_id"],
                "step": "review",
                "filename": filename,
                "headers": columns,
                "mapping": payload["mapping"],
                "field_reviews": payload["field_reviews"],
                "required_fields": QUOTE_COMPARE_REQUIRED_FIELDS,
                "optional_fields": QUOTE_COMPARE_OPTIONAL_FIELDS,
                "matched_fields": payload["matched_fields"],
                "missing_fields": payload["missing_fields"],
                "optional_columns": payload["optional_columns"],
                "review_message": payload["review_message"],
                "message": payload["message"],
                "dataframe": {
                    "columns": columns,
                    "records": serialize_dataframe_records(df)
                }
            }
        )

        return JSONResponse({"success": True, **payload})

    @app.post("/quote-compare/upload/confirm")
    async def confirm_quote_compare_upload(
        file: UploadFile | None = File(None),
        mappings: str = Form(...),
        session_id: str | None = Form(None)
    ):
        filename = file.filename or ""

        try:
            parsed_mapping = json.loads(mappings)
            if not isinstance(parsed_mapping, dict):
                raise ValueError
        except ValueError:
            return JSONResponse(
                {
                    "success": False,
                    "message": "The selected quote field mappings could not be understood. Please review them and try again."
                },
                status_code=400
            )

        try:
            session_payload = validate_quote_compare_active_session(load_quote_compare_active_session(session_id))
            if file is not None and (file.filename or ""):
                df = read_uploaded_dataframe(file)
            elif session_payload and session_payload.get("dataframe"):
                df = hydrate_dataframe_from_session(
                    session_payload["dataframe"].get("columns", []),
                    session_payload["dataframe"].get("records", [])
                )
                filename = session_payload.get("filename", filename)
            else:
                raise ValueError("The uploaded supplier file is no longer available. Please upload it again.")
            full_mapping = {
                field_name: parsed_mapping.get(field_name)
                for field_name in [*QUOTE_COMPARE_REQUIRED_FIELDS, *QUOTE_COMPARE_OPTIONAL_FIELDS]
            }
            mapped_df = apply_column_mapping(
                df,
                full_mapping,
                required_fields=QUOTE_COMPARE_REQUIRED_FIELDS
            )
            normalized_comparison = normalize_quote_comparison_payload({
                "name": Path(filename).stem.replace("_", " ").strip() or "Uploaded quote comparison",
                "sourcing_need": "",
                "source_type": "upload",
                "bids": build_quote_bids_from_dataframe(mapped_df)
            })
            evaluation = calculate_quote_comparison(normalized_comparison)
            if session_id:
                save_quote_compare_active_session(
                    session_id,
                    {
                        **(session_payload or {}),
                        "session_id": session_id,
                        "step": "analyze",
                        "filename": filename,
                        "mapping": parsed_mapping,
                        "comparison": normalized_comparison,
                        "evaluation": evaluation
                    }
                )
        except ValueError as exc:
            return JSONResponse({"success": False, "message": str(exc)}, status_code=400)
        except Exception:
            logger.exception("Failed to confirm quote compare upload: %s", filename)
            return JSONResponse(
                {
                    "success": False,
                    "message": "The supplier offer file could not be imported. Please review the mappings and try again."
                },
                status_code=400
            )

        return JSONResponse({
            "success": True,
            "session_id": session_id,
            "comparison": normalized_comparison,
            "evaluation": evaluation,
            "message": f"Imported supplier offers from {filename}"
        })

    @app.post("/quote-compare/evaluate")
    def evaluate_quote_comparison(payload: QuoteComparisonPayload):
        try:
            normalized_comparison = normalize_quote_comparison_payload(payload.model_dump())
            evaluation = calculate_quote_comparison(normalized_comparison)
        except ValueError as exc:
            return JSONResponse({"success": False, "message": str(exc)}, status_code=400)

        return JSONResponse({
            "success": True,
            "comparison": normalized_comparison,
            "evaluation": evaluation
        })

    @app.post("/quote-compare/save")
    def save_quote_comparison(payload: QuoteComparisonPayload):
        try:
            normalized_comparison = normalize_quote_comparison_payload(payload.model_dump())
            validate_quote_comparison_payload(normalized_comparison, require_name=True)
            evaluation = calculate_quote_comparison(normalized_comparison)
        except ValueError as exc:
            return JSONResponse({"success": False, "message": str(exc)}, status_code=400)

        now = datetime.now(timezone.utc).isoformat()
        store = load_quote_comparisons_store()
        comparisons = store.get("comparisons", [])
        comparison_id = normalized_comparison["comparison_id"] or str(uuid.uuid4())
        existing_comparison = next(
            (comparison for comparison in comparisons if comparison.get("comparison_id") == comparison_id),
            None
        )

        saved_comparison = {
            "comparison_id": comparison_id,
            "name": normalized_comparison["name"],
            "sourcing_need": normalized_comparison["sourcing_need"],
            "weighting": normalized_comparison["weighting"],
            "source_type": normalized_comparison["source_type"],
            "mode": normalized_comparison["mode"],
            "bids": normalized_comparison["bids"],
            "updated_at": now,
            "created_at": existing_comparison.get("created_at") if existing_comparison else now
        }

        if existing_comparison:
            comparisons = [
                saved_comparison if comparison.get("comparison_id") == comparison_id else comparison
                for comparison in comparisons
            ]
        else:
            comparisons.append(saved_comparison)

        store["comparisons"] = comparisons
        save_quote_comparisons_store(store)

        return JSONResponse({
            "success": True,
            "comparison": saved_comparison,
            "evaluation": evaluation,
            "comparisons": comparisons,
            "message": f"Comparison saved: {saved_comparison['name']}"
        })

    @app.post("/quote-compare/delete")
    def delete_quote_comparison(payload: QuoteComparisonDeletePayload):
        comparison_id = str(payload.comparison_id or "").strip()
        if not comparison_id:
            return JSONResponse({"success": False, "message": "Choose a comparison to delete."}, status_code=400)

        store = load_quote_comparisons_store()
        comparisons = store.get("comparisons", [])
        existing_comparison = next(
            (comparison for comparison in comparisons if comparison.get("comparison_id") == comparison_id),
            None
        )
        if not existing_comparison:
            return JSONResponse({"success": False, "message": "The selected comparison could not be found."}, status_code=404)

        updated_comparisons = [
            comparison for comparison in comparisons if comparison.get("comparison_id") != comparison_id
        ]
        store["comparisons"] = updated_comparisons
        save_quote_comparisons_store(store)

        return JSONResponse({
            "success": True,
            "deleted_comparison_id": comparison_id,
            "comparisons": updated_comparisons,
            "message": f"Deleted comparison: {existing_comparison.get('name', 'Quote Comparison')}"
        })

    return app

templates = build_templates()
app = create_app()
