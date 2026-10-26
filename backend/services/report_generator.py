import os
import sys
import io
import datetime
import logging
from typing import Dict, Any, Optional, Tuple, List
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import reportlab.pdfbase.ttfonts as ttfonts
import reportlab.pdfbase.pdfmetrics as pdfmetrics

from backend.services.process_analyzer import process_analyzer
from backend.services.gmail_service import gmail_service
from backend.services.pi_service import pi_service

logger = logging.getLogger("REPORT-GEN")
logging.basicConfig(level=logging.INFO)

def normalize_key(k: str) -> str:
    """항목명 매칭을 위한 문자열 정규화"""
    if not k:
        return ""
    k = str(k).lower().strip()
    k = k.replace("’", "'").replace("`", "'")
    k = k.replace(" ", "")
    k = k.replace("-", "").replace("_", "").replace("/", "")
    k = k.replace("℃", "c").replace("°c", "c")
    k = k.replace("(dry)", "")
    if "phenol" in k or k == "phl":
        return "phenol"
    if "meltcolor" in k:
        return "meltcolor"
    if "freezing" in k:
        return "freezingpoint"
    if "purity" in k:
        return "bpapurity"
    if "2,4" in k or "24" in k:
        return "24bpa"
    if "alcohol" in k:
        return "solutioncoloralcohol"
    if "alkali" in k:
        return "solutioncoloralkali"
    return k

class ReportGenerator:
    def __init__(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        candidate_img_dirs = [
            os.path.join(base_dir, "assets", "images")
        ]
        if hasattr(sys, '_MEIPASS'):
            candidate_img_dirs.insert(0, os.path.join(sys._MEIPASS, "backend", "assets", "images"))
            candidate_img_dirs.insert(0, os.path.join(sys._MEIPASS, "assets", "images"))
        if getattr(sys, 'frozen', False):
            candidate_img_dirs.append(os.path.join(os.path.dirname(sys.executable), "backend", "assets", "images"))

        self.img_dir = candidate_img_dirs[0]
        for cid in candidate_img_dirs:
            if os.path.exists(cid):
                self.img_dir = cid
                break

        self.base_dir = base_dir
        self._init_fonts()

    def _init_fonts(self):
        """Windows 및 다양한 환경에서 한글 폰트 자동 등록"""
        self.font_regular = "Helvetica"
        self.font_bold = "Helvetica-Bold"

        font_candidates = [
            ("C:/Windows/Fonts/malgun.ttf", "C:/Windows/Fonts/malgunbd.ttf"),
            ("C:/Windows/Fonts/gulim.ttc", "C:/Windows/Fonts/gulim.ttc"),
            ("/usr/share/fonts/truetype/nanum/NanumGothic.ttf", "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf"),
        ]

        for reg_path, bold_path in font_candidates:
            if os.path.exists(reg_path):
                try:
                    pdfmetrics.registerFont(ttfonts.TTFont("AppRegular", reg_path))
                    self.font_regular = "AppRegular"
                    if os.path.exists(bold_path):
                        pdfmetrics.registerFont(ttfonts.TTFont("AppBold", bold_path))
                        self.font_bold = "AppBold"
                    else:
                        self.font_bold = "AppRegular"
                    logger.info(f"[REPORT-GEN] Registered font: {reg_path}")
                    break
                except Exception as e:
                    logger.warning(f"[REPORT-GEN] Font register failed: {e}")

    def generate_pdf_bytes(
        self,
        lot_no: str,
        customer_name: str = "표준",
        product_name: str = "BISPHENOL-A",
        issue_date: Optional[str] = None,
        custom_sign_title: str = "Team Leader",
        custom_sign_dept: str = "Environment Technology",
        custom_sign_name: str = "G.H. Kim"
    ) -> bytes:
        """
        주어진 Lot No.와 고객사에 맞는 공식 성적서 PDF를 인메모리 바이트 스트림으로 생성합니다.
        """
        logger.info(f"[REPORT-GEN] Generating CoA PDF for Lot={lot_no}, Customer={customer_name}")
        
        # 1. Lot 분석 데이터 집계
        st_date_val = ""
        st_time_val = "00:00"
        end_date_val = ""
        end_time_val = "23:59"

        # PI 세션 이력에서 ST~END 구간 자동 검색
        history = pi_service.get_silo_import_history(days=30)
        found_sess = None
        for h in history:
            if h.get("lot_no") == lot_no:
                found_sess = h
                st_parts = h.get("start_time", "").split(" ")
                st_date_val = st_parts[0] if len(st_parts) > 0 else ""
                st_time_val = st_parts[1] if len(st_parts) > 1 else "00:00"

                end_raw = h.get("end_time", "")
                if "진행" in end_raw or not end_raw:
                    end_date_val = datetime.date.today().strftime("%Y-%m-%d")
                    end_time_val = "23:59"
                else:
                    end_parts = end_raw.split(" ")
                    end_date_val = end_parts[0] if len(end_parts) > 0 else ""
                    end_time_val = end_parts[1] if len(end_parts) > 1 else "23:59"
                break

        points = gmail_service.fetch_latest_analysis_points()
        lot_analysis = process_analyzer.calculate_lot_values(
            lot_no=lot_no,
            st_date=st_date_val or datetime.date.today().strftime("%Y-%m-%d"),
            st_time=st_time_val,
            end_date=end_date_val or datetime.date.today().strftime("%Y-%m-%d"),
            end_time=end_time_val,
            analysis_points=points
        )

        analysis_items = lot_analysis.get("items", {})

        # 2. 날짜 포맷
        if not issue_date:
            issue_date = datetime.date.today().strftime("%Y.%m.%d")
        else:
            issue_date = str(issue_date).replace("-", ".")

        # 시험일자: 수입 종료일 또는 개시일
        test_date = end_date_val.replace("-", ".") if end_date_val else issue_date

        # 3. ReportLab 문서 빌드
        buf = io.BytesIO()
        margin_h = 40
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=margin_h,
            rightMargin=margin_h,
            topMargin=35,
            bottomMargin=35
        )

        elements = []

        # --- 상단 헤더: 좌측 로고, 우측 회사 주소/연락처 ---
        logo_path = os.path.join(self.img_dir, "logo.jpg")
        header_cells = []
        if os.path.exists(logo_path):
            logo_w = 135
            logo_h = 135 * (543 / 2560)  # 비율 유지
            header_cells.append(Image(logo_path, width=logo_w, height=logo_h))
        else:
            header_cells.append(Paragraph("<b>SAMYANG INNOCHEM</b>", ParagraphStyle('NoLogo', fontName=self.font_bold, fontSize=14)))

        header_addr_style = ParagraphStyle(
            'HeaderAddr',
            fontName=self.font_regular,
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor('#444444'),
            alignment=2  # Right
        )
        addr_p = Paragraph(
            '전라북도 군산시 자유무역 1길 133 (우)54001<br/>Tel) 063-440-7114 &nbsp;&nbsp; Fax) 063-464-1509',
            header_addr_style
        )
        header_cells.append(addr_p)

        header_table = Table([header_cells], colWidths=[180, 335.27])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(header_table)

        # 상단 구분선
        elements.append(HRFlowable(
            width='100%', thickness=0.75, color=colors.HexColor('#b0b8c0'),
            spaceBefore=4, spaceAfter=18
        ))

        # --- 대제목: 제 품 성 적 서 ---
        title_style = ParagraphStyle(
            'MainTitle',
            fontName=self.font_bold,
            fontSize=21,
            leading=25,
            alignment=1,  # Center
            textColor=colors.black
        )
        elements.append(Paragraph('<u>제 &nbsp; 품 &nbsp; 성 &nbsp; 적 &nbsp; 서</u>', title_style))
        elements.append(Spacer(1, 16))

        # --- 기본 정보 표 (2x4) ---
        th_style = ParagraphStyle('MetaTH', fontName=self.font_bold, fontSize=9.5, leading=12, alignment=1)
        td_style = ParagraphStyle('MetaTD', fontName=self.font_regular, fontSize=9.5, leading=12, alignment=1)

        disp_product = product_name or "BISPHENOL-A"
        disp_customer = customer_name if customer_name and customer_name != "표준" else "공용 (표준)"

        meta_data = [
            [Paragraph('제 품 명', th_style), Paragraph(disp_product, td_style),
             Paragraph('출 하 선', th_style), Paragraph(disp_customer, td_style)],
            [Paragraph('Lot No.', th_style), Paragraph(lot_no, td_style),
             Paragraph('시 험 일 자', th_style), Paragraph(test_date, td_style)]
        ]
        t_meta = Table(meta_data, colWidths=[95, 162.63, 95, 162.64])
        t_meta.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.75, colors.HexColor('#222222')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f8f9fa')),
            ('BACKGROUND', (2,0), (2,-1), colors.HexColor('#f8f9fa')),
        ]))
        elements.append(t_meta)
        elements.append(Spacer(1, 14))

        # --- 분석 항목 정의 및 고객사별 분기 ---
        th_spec = ParagraphStyle('THSpec', fontName=self.font_bold, fontSize=9, leading=11, alignment=1, textColor=colors.HexColor('#1a202c'))
        td_spec_l = ParagraphStyle('TDSpecL', fontName=self.font_regular, fontSize=8.5, leading=11, alignment=0)
        td_spec_c = ParagraphStyle('TDSpecC', fontName=self.font_regular, fontSize=8.5, leading=11, alignment=1)
        td_spec_bold = ParagraphStyle('TDSpecBold', fontName=self.font_bold, fontSize=8.5, leading=11, alignment=1)

        spec_header = [
            Paragraph('Product Characteristics', th_spec),
            Paragraph('Unit', th_spec),
            Paragraph('Method', th_spec),
            Paragraph('Result', th_spec)
        ]

        # 기본 표준 항목
        item_defs = [
            ("Appearance", "-", "-", "Appearance", False),
            ("Freezing Point", "℃", "AM-B-510", "Freezing Point", True),
            ("Melt Color (at 175℃, 0.5hr)", "Pt-Co", "ASTM D1209", "Melt Color", True),
            ("Solution Color (Alcohol)", "Pt-Co", "ASTM D1209", "Solution Color (Alcohol)", True),
        ]

        # 국도화학 전용: Alkali 색상 포함
        if "국도" in customer_name:
            item_defs.append(("Solution Color (Alkali)", "Pt-Co", "ASTM D1209", "Solution Color (Alkali)", True))

        item_defs.extend([
            ("BPA Purity (dry)", "wt%", "AM-B-513", "BPA Purity (dry)", True),
            ("Phenol", "wtppm", "AM-B-513", "Phenol", True),
            ("2,4'-BPA", "wtppm", "AM-B-513", "2,4'-BPA", True),
            ("Water", "wt%", "AM-B-516", "Water", True),
            ("Iron", "wtppm", "AM-B-514", "Iron", True),
            ("Ash", "wtppm", "AM-B-515", "Ash", True),
        ])

        # 삼양화성 전용: Prill Size 항목 포함 (실측치 부재 시 공란 유지)
        if "삼양화성" in customer_name:
            for ps_label in [
                "Prill Size(2)", "Prill Size(1)", "Prill Size(0.25)",
                "Prill Size (0.125)", "Prill Size (0.075)"
            ]:
                item_defs.append((ps_label, "wt%", "AM-B-518", None, True))

        # 정규화된 딕셔너리 생성
        norm_analysis = {}
        for k, v in analysis_items.items():
            norm_analysis[normalize_key(k)] = v

        # 행 데이터 생성
        rows = [spec_header]
        for label, unit, method, data_key, is_bold in item_defs:
            val_str = ""
            if data_key:
                nk = normalize_key(data_key)
                if nk in norm_analysis:
                    val_str = str(norm_analysis[nk].get("value", ""))
                elif data_key in analysis_items:
                    val_str = str(analysis_items[data_key].get("value", ""))
            elif data_key is None:
                val_str = ""  # 삼양화성 Prill Size 등 공란 항목

            val_p = Paragraph(val_str, td_spec_bold if is_bold else td_spec_c)
            rows.append([
                Paragraph(label, td_spec_l),
                Paragraph(unit, td_spec_c),
                Paragraph(method, td_spec_c),
                val_p
            ])

        t_specs = Table(rows, colWidths=[205.27, 80, 110, 120])
        t_specs.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e8eef5')),
            ('GRID', (0,0), (-1,-1), 0.75, colors.HexColor('#222222')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 3.5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
            ('LEFTPADDING', (0,1), (0,-1), 8),
        ]))
        elements.append(t_specs)
        elements.append(Spacer(1, 14))

        # --- 보증 문구 (좌측 정렬) ---
        assur_style = ParagraphStyle(
            'Assurance',
            fontName=self.font_regular,
            fontSize=10,
            leading=13,
            alignment=0,
            textColor=colors.black
        )
        elements.append(Paragraph('위 &nbsp;제 품 &nbsp;성 적 서 의 &nbsp;결 과 에 &nbsp;대 하 여 &nbsp;보 증 합 니 다.', assur_style))
        elements.append(Spacer(1, 20))

        # --- 하단 서명부 (우측 정렬 블록) ---
        sig_path = os.path.join(self.img_dir, "signature.jpg")
        if os.path.exists(sig_path):
            sig_img = Image(sig_path, width=80, height=28)
            sig_img.hAlign = 'LEFT'
            sig_flowable = sig_img
        else:
            sig_flowable = Paragraph("<b>[서명]</b>", ParagraphStyle('SigAlt', fontName=self.font_bold, fontSize=11))

        lbl_style = ParagraphStyle('LblStyle', fontName=self.font_regular, fontSize=9.5, leading=13, alignment=0)
        val_style = ParagraphStyle('ValStyle', fontName=self.font_regular, fontSize=9.5, leading=13, alignment=0)
        comp_name_style = ParagraphStyle('CompName', fontName=self.font_bold, fontSize=10, leading=14, alignment=0)
        comp_role_style = ParagraphStyle('CompRole', fontName=self.font_bold, fontSize=9, leading=13, alignment=0)

        hr_under = HRFlowable(width=175, thickness=0.75, color=colors.black, spaceBefore=2, spaceAfter=6, hAlign='LEFT')

        signed_cell_flowables = [
            sig_flowable,
            hr_under,
            Paragraph(custom_sign_name, comp_name_style),
            Paragraph(custom_sign_title, comp_role_style),
            Paragraph(custom_sign_dept, comp_role_style),
            Paragraph('Samyang Innochem Corporation', comp_name_style)
        ]

        bottom_table_data = [
            ['', Paragraph('Date', lbl_style), Paragraph(':', lbl_style), Paragraph(issue_date, val_style)],
            ['', '', '', Spacer(1, 6)],
            ['', Paragraph('Signed', lbl_style), Paragraph(':', lbl_style), signed_cell_flowables]
        ]

        bottom_table = Table(bottom_table_data, colWidths=[245, 50, 15, 205.27])
        bottom_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        elements.append(bottom_table)

        # 문서 빌드
        doc.build(elements)
        pdf_bytes = buf.getvalue()
        logger.info(f"[REPORT-GEN] Successfully generated PDF for Lot={lot_no} ({len(pdf_bytes)} bytes)")
        return pdf_bytes

report_generator = ReportGenerator()
