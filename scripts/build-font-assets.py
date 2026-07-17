#!/usr/bin/env python3
"""从官方母版生成 Gleamory 的六份本地 WOFF2 字体。

需要 Python 3、fonttools[woff] 与 brotli。母版只用于本地构建，不提交仓库。
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "src/assets/fonts"
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"
RUNTIME_EXTENSIONS = {".css", ".html", ".json", ".ts", ".tsx"}
IGNORED_PARTS = {"__tests__", "test", "tests"}

SOURCES = {
    "source-han-serif": {
        "version": "2.001",
        "ref": "2.001R",
        "license": "SIL Open Font License 1.1",
        "licensePath": "/licenses/fonts/source-han-fonts-OFL-1.1.txt",
        "repository": "https://github.com/adobe-fonts/source-han-serif",
    },
    "source-han-sans": {
        "version": "2.005",
        "ref": "2.005R",
        "license": "SIL Open Font License 1.1",
        "licensePath": "/licenses/fonts/source-han-fonts-OFL-1.1.txt",
        "repository": "https://github.com/adobe-fonts/source-han-sans",
    },
    "source-code-pro": {
        "version": "2.042",
        "ref": "2.042R-u/1.062R-i/1.026R-vf",
        "license": "SIL Open Font License 1.1",
        "licensePath": "/licenses/fonts/source-code-pro-OFL-1.1.txt",
        "repository": "https://github.com/adobe-fonts/source-code-pro",
    },
}

FACES = (
    {
        "source": "SourceHanSerifSC-Medium.otf",
        "sourceId": "source-han-serif",
        "sourceUrl": "https://raw.githubusercontent.com/adobe-fonts/source-han-serif/2.001R/OTF/SimplifiedChinese/SourceHanSerifSC-Medium.otf",
        "sourceSha256": "f21a315b6611fef7f7a2156cb25646c0182ffed9d66988448234ae9e4bf8f955",
        "output": "GleamoryEditorial-Medium.woff2",
        "family": "Gleamory Editorial",
        "style": "Medium",
        "weight": 500,
        "coverage": "gb2312-runtime",
        "scenario": "诗词、远程内容及其他动态编辑文字",
    },
    {
        "source": "SourceHanSerifSC-SemiBold.otf",
        "sourceId": "source-han-serif",
        "sourceUrl": "https://raw.githubusercontent.com/adobe-fonts/source-han-serif/2.001R/OTF/SimplifiedChinese/SourceHanSerifSC-SemiBold.otf",
        "sourceSha256": "a75db65b2833969e7f18b17e9680b99a20ad2116d84d8fba49fc50d04ac05be2",
        "output": "GleamoryEditorial-SemiBold.woff2",
        "family": "Gleamory Editorial",
        "style": "SemiBold",
        "weight": 600,
        "coverage": "runtime",
        "scenario": "品牌、页面标题与固定章节标题",
    },
    {
        "source": "SourceHanSansSC-Regular.otf",
        "sourceId": "source-han-sans",
        "sourceUrl": "https://raw.githubusercontent.com/adobe-fonts/source-han-sans/2.005R/OTF/SimplifiedChinese/SourceHanSansSC-Regular.otf",
        "sourceSha256": "f1d8611151880c6c336aabeac4640ef434fa13cbfbf1ffe82d0a71b2a5637256",
        "output": "GleamoryUI-Regular.woff2",
        "family": "Gleamory UI",
        "style": "Regular",
        "weight": 400,
        "coverage": "gb2312-runtime",
        "scenario": "正文、输入、文件名与动态提示",
    },
    {
        "source": "SourceHanSansSC-Medium.otf",
        "sourceId": "source-han-sans",
        "sourceUrl": "https://raw.githubusercontent.com/adobe-fonts/source-han-sans/2.005R/OTF/SimplifiedChinese/SourceHanSansSC-Medium.otf",
        "sourceSha256": "1df61d31687d04fd2f928a3bb6ca6cd61f0e988cc267cf317f32406edbb49f70",
        "output": "GleamoryUI-Medium.woff2",
        "family": "Gleamory UI",
        "style": "Medium",
        "weight": 500,
        "coverage": "runtime",
        "scenario": "固定控件、标签与状态",
    },
    {
        "source": "SourceCodePro-Regular.otf",
        "sourceId": "source-code-pro",
        "sourceUrl": "https://raw.githubusercontent.com/adobe-fonts/source-code-pro/2.042R-u/1.062R-i/1.026R-vf/OTF/SourceCodePro-Regular.otf",
        "sourceSha256": "9f9664e2edf6f045c11e774f9bd0be6993971f2544a39061a5ce478b96b051f8",
        "output": "GleamoryMono-Regular.woff2",
        "family": "Gleamory Mono",
        "style": "Regular",
        "weight": 400,
        "coverage": "mono",
        "scenario": "数字、时间、坐标、日志与代码",
    },
    {
        "source": "SourceCodePro-Medium.otf",
        "sourceId": "source-code-pro",
        "sourceUrl": "https://raw.githubusercontent.com/adobe-fonts/source-code-pro/2.042R-u/1.062R-i/1.026R-vf/OTF/SourceCodePro-Medium.otf",
        "sourceSha256": "d6d11eb2088ce200b59f0fb620dba4f54c153b99fd2985c9708b0aa7037a1945",
        "output": "GleamoryMono-Medium.woff2",
        "family": "Gleamory Mono",
        "style": "Medium",
        "weight": 500,
        "coverage": "mono",
        "scenario": "强调数字、时间、坐标与代码值",
    },
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def collect_runtime_codepoints() -> set[int]:
    codepoints: set[int] = set()
    roots = (ROOT / "src", ROOT / "index.html")
    paths = [roots[1], *roots[0].rglob("*")]
    for path in paths:
        if not path.is_file() or path.suffix not in RUNTIME_EXTENSIONS:
            continue
        if any(part in IGNORED_PARTS for part in path.parts):
            continue
        try:
            codepoints.update(map(ord, path.read_text(encoding="utf-8")))
        except UnicodeDecodeError:
            continue
    return codepoints


def collect_gb2312_codepoints() -> set[int]:
    codepoints: set[int] = set()
    for high in range(0xA1, 0xF8):
        for low in range(0xA1, 0xFF):
            try:
                codepoints.add(ord(bytes((high, low)).decode("gb2312")))
            except UnicodeDecodeError:
                pass
    return codepoints


def collect_mono_codepoints() -> set[int]:
    ranges = (
        (0x0020, 0x00FF),
        (0x2000, 0x206F),
        (0x20A0, 0x20CF),
        (0x2100, 0x214F),
        (0x2190, 0x21FF),
        (0x2200, 0x22FF),
    )
    return {codepoint for start, end in ranges for codepoint in range(start, end + 1)}


def compress_ranges(codepoints: set[int]) -> list[str]:
    if not codepoints:
        return []
    values = sorted(codepoints)
    ranges: list[str] = []
    start = previous = values[0]
    for value in values[1:]:
        if value == previous + 1:
            previous = value
            continue
        ranges.append(f"{start:04X}" if start == previous else f"{start:04X}-{previous:04X}")
        start = previous = value
    ranges.append(f"{start:04X}" if start == previous else f"{start:04X}-{previous:04X}")
    return ranges


def rename_font(font: TTFont, family: str, style: str, weight: int) -> None:
    postscript_family = family.replace(" ", "")
    postscript_name = f"{postscript_family}-{style}"
    full_name = f"{family} {style}"
    unique_id = f"Gleamory;{postscript_name}"
    name_table = font["name"]
    replacement_ids = {1, 2, 3, 4, 6, 16, 17}
    name_table.names = [record for record in name_table.names if record.nameID not in replacement_ids]
    values = {
        1: family,
        2: style,
        3: unique_id,
        4: full_name,
        6: postscript_name,
        16: family,
        17: style,
    }
    for name_id, value in values.items():
        name_table.setName(value, name_id, 3, 1, 0x0409)
        name_table.setName(value, name_id, 1, 0, 0)

    font["OS/2"].usWeightClass = weight
    if "CFF " in font:
        top_dict = font["CFF "].cff.topDictIndex[0]
        top_dict.FamilyName = family
        top_dict.FullName = full_name
        top_dict.FontName = postscript_name


def subset_face(source_path: Path, output_path: Path, face: dict, requested: set[int]) -> set[int]:
    font = TTFont(source_path, recalcTimestamp=False)
    available = set(font.getBestCmap())
    selected = requested & available
    missing = requested - available
    required_cjk = collect_gb2312_codepoints() if face["coverage"] == "gb2312-runtime" else {
        value for value in requested if 0x3400 <= value <= 0x9FFF
    }
    missing_required = missing & required_cjk
    if face["coverage"] != "mono" and missing_required:
        sample = " ".join(f"U+{value:04X}" for value in sorted(missing_required)[:12])
        raise RuntimeError(
            f"{source_path.name} 缺少 {len(missing_required)} 个职责内中文码位：{sample}"
        )

    options = subset.Options()
    options.flavor = "woff2"
    # 仅保留横排网页实际使用的布局能力，避免把竖排与地区异体字闭包带入子集。
    options.layout_features = ["ccmp", "kern", "liga"]
    options.name_IDs = ["*"]
    options.name_languages = [0x0409]
    options.name_legacy = False
    options.notdef_glyph = True
    options.recommended_glyphs = True
    options.glyph_names = True
    options.symbol_cmap = True
    options.legacy_cmap = True
    options.recalc_average_width = True
    options.recalc_max_context = True
    options.drop_tables += ["BASE", "VORG", "vhea", "vmtx"]
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=selected)
    subsetter.subset(font)
    rename_font(font, face["family"], face["style"], face["weight"])
    font.flavor = "woff2"
    font.save(output_path, reorderTables=False)
    return set(TTFont(output_path).getBestCmap())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_dir", type=Path, help="包含六份官方 OTF 母版的目录")
    args = parser.parse_args()
    source_dir = args.source_dir.resolve()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    runtime = collect_runtime_codepoints()
    gb2312 = collect_gb2312_codepoints()
    coverage_sets = {
        "runtime": runtime,
        "gb2312-runtime": runtime | gb2312,
        "mono": collect_mono_codepoints(),
    }
    files = []
    actual_profiles: dict[str, set[int]] = {}
    for face in FACES:
        source_path = source_dir / face["source"]
        if not source_path.is_file():
            raise FileNotFoundError(source_path)
        actual_source_sha = sha256(source_path)
        if actual_source_sha != face["sourceSha256"]:
            raise RuntimeError(f"{source_path.name} 校验失败：{actual_source_sha}")
        output_path = OUTPUT_DIR / face["output"]
        actual_coverage = subset_face(
            source_path,
            output_path,
            face,
            coverage_sets[face["coverage"]],
        )
        previous_profile = actual_profiles.get(face["coverage"])
        if previous_profile is not None and previous_profile != actual_coverage:
            raise RuntimeError(f"同一覆盖档案的字重 cmap 不一致：{face['coverage']}")
        actual_profiles[face["coverage"]] = actual_coverage
        files.append(
            {
                "path": face["output"],
                "family": face["family"],
                "style": face["style"],
                "weight": face["weight"],
                "coverage": face["coverage"],
                "scenario": face["scenario"],
                "sourceId": face["sourceId"],
                "sourceFile": face["source"],
                "sourceUrl": face["sourceUrl"],
                "sourceSha256": face["sourceSha256"],
                "sha256": sha256(output_path),
                "bytes": output_path.stat().st_size,
                "codepointCount": len(actual_coverage),
            }
        )
        print(f"{face['output']}: {output_path.stat().st_size:,} bytes")

    manifest = {
        "schemaVersion": 1,
        "generatedBy": "PYTHONPATH=/path/to/fonttools python3 scripts/build-font-assets.py /path/to/official-otf",
        "runtimeScan": {
            "roots": ["src/**/*.{css,json,ts,tsx}", "index.html"],
            "excludedDirectories": sorted(IGNORED_PARTS),
            "codepointCount": len(runtime),
            "codepointRanges": compress_ranges(runtime),
        },
        "coverageProfiles": {
            "gb2312-runtime": {
                "description": "完整 GB2312 加当前运行时字符",
                "codepointCount": len(actual_profiles["gb2312-runtime"]),
                "codepointRanges": compress_ranges(actual_profiles["gb2312-runtime"]),
            },
            "runtime": {
                "description": "当前运行时字符",
                "codepointCount": len(actual_profiles["runtime"]),
                "codepointRanges": compress_ranges(actual_profiles["runtime"]),
            },
            "mono": {
                "description": "ASCII、Latin-1、常用单位、货币与数学符号；不包含中文",
                "codepointCount": len(actual_profiles["mono"]),
                "codepointRanges": compress_ranges(actual_profiles["mono"]),
            },
        },
        "sources": SOURCES,
        "budgets": {
            "dynamicCjkFileBytes": 2_200_000,
            "coreCjkFileBytes": 500_000,
            "monoFileBytes": 100_000,
            "totalBytes": 5_000_000,
        },
        "files": files,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"manifest: {MANIFEST_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
