import {getClass} from 'IzendaSynergy';
import * as d3 from 'd3';

import {DATA_TYPE, DEFAULT_COLORS} from './../utils/CustomVizConstant';
import {helpers} from './../utils/CustomVizHelper';

const ChartOptionsBuilder = getClass('ChartOptionsBuilder');

export default class D3TimelineOptionsBuilder extends ChartOptionsBuilder {
		build() {
				//get essential informations from response's JSON.
				const {chartData} = this;
				const groupField = chartData.dataStructure['separators'][0];
				const metricField = chartData.dataStructure['values'][0];
				const startField = chartData.dataStructure['startRange'][0];
				const endField = chartData.dataStructure['endRange'][0];

				const rangeDataType = startField.reportPartElm.properties.dataFormattings.functionInfo.dataType;
				const group = [...(new Set(chartData.records.map(record => record[groupField.columnName])))] || [];

				const startFieldOptions = this.fieldOptions[startField.fieldNameAlias];
				const groupOptions = {
						cellColors: this.fieldOptions[groupField.fieldNameAlias].cellColor,
						alternativeText: this.fieldOptions[groupField.fieldNameAlias].alternativeText,
						fieldDataType: this.fieldOptions[groupField.fieldNameAlias].fieldDataType,
						fieldFormatData: this.fieldOptions[groupField.fieldNameAlias].fieldFormatData
				};

				const metricOptions = {
						cellColors: this.fieldOptions[metricField.fieldNameAlias].cellColors,
						alternativeText: this.fieldOptions[metricField.fieldNameAlias].alternativeText,
						fieldDataType: this.fieldOptions[metricField.fieldNameAlias].fieldDataType,
						fieldFormatData: this.fieldOptions[metricField.fieldNameAlias].fieldFormatData
				};

				const startOptions = {
						fieldDataType: startFieldOptions.fieldDataType,
						objFormat: helpers.getFormatObject(startFieldOptions.fieldDataType, startFieldOptions.fieldFormatData)
				};

				// settings for group: text color, alternative text
				let arrGroup = [];
				group.forEach((name, i) => {
						let obj = {
								id: i,
								name: name,
								sum: 0,
								percentage: 0,
								textColor: helpers.getSettings(groupOptions, 'cellColors', name),
								alternativeText: helpers.getSettings(groupOptions, 'alternativeText', name)
						};
						arrGroup = [
								...arrGroup,
								obj
						];
				});

				console.log(chartData.records[0][startField.columnName]);
				const parseToDateTimeFormat = (startFieldOptions.fieldDataType === DATA_TYPE.DATE && !startFieldOptions.fieldFormatData)
						? true
						: startOptions.objFormat && helpers.hasParseDate(startOptions.objFormat);

				let items = [];
				chartData
						.records
						.forEach(record => {
								const start = record[startField.columnName];
								const end = record[endField.columnName];
								if (start && end) {
										let item = {
												groupId: group.indexOf(record[groupField.columnName]),
												value: record[metricField.columnName],
												start,
												end,
												parsedStart: (startFieldOptions.fieldDataType !== DATA_TYPE.DATE || (startFieldOptions.fieldDataType === DATA_TYPE.DATE && !parseToDateTimeFormat))
														? start
														: helpers.parseDate(start, startOptions.objFormat),
												parsedEnd: (startFieldOptions.fieldDataType !== DATA_TYPE.DATE || (startFieldOptions.fieldDataType === DATA_TYPE.DATE && !parseToDateTimeFormat))
														? end
														: helpers.parseDate(end, startOptions.objFormat),
												groupName: record[groupField.columnName],
												percentage: record[`percentage_${metricField.columnName}`]
														? record[`percentage_${metricField.columnName}`]
														: null
										};
										item.fillColor = helpers.getSettings(metricOptions, 'cellColors', item.value, item.percentage);
										items = [
												...items,
												item
										];
								}
						});

				const metricFormat = helpers.getD3Format(metricOptions.fieldDataType, metricOptions.fieldFormatData);
				const rangeFormat = helpers.getD3Format(startFieldOptions.fieldDataType, startFieldOptions.fieldFormatData);

				let chartConfigs = {
						type: this.visualType,
						rangeDataType: startOptions.fieldDataType,
						data: {
								arrGroup,
								items
						},
						styles: {
								colors: this.chartOptions.colors || DEFAULT_COLORS,
								isShowTooltip: this.chartOptions.commonOptions.plotOptions.series.states.hover.enabled,
								plotBgColor: this.chartOptions.commonOptions.chart.plotBackgroundColor || 'none'
						},
						fieldNameAlias: {
								groupField: groupField.fieldNameAlias,
								metricField: metricField.fieldNameAlias,
								startField: startField.fieldNameAlias,
								endField: endField.fieldNameAlias
						},
						range: {},
						scales: {},
						formats: {
								metric: metricFormat,
								range: rangeFormat
						},
						fieldOptions: {
								groupOptions,
								metricOptions,
								startOptions
						}
				};

				const {timelineBegin, timelineEnd} = helpers.getTimelineRange(items, parseToDateTimeFormat);
				chartConfigs.range = {
						timelineBegin,
						timelineEnd
				};

				//define scales
				const defineScales = (dataType) => {
						let scales = {
								y1: d3
										.scaleLinear()
										.domain([0, group.length]),
								y2: d3
										.scaleLinear()
										.domain([0, group.length])
						};

						switch (dataType) {
								case DATA_TYPE.DATE:
										if (parseToDateTimeFormat) {
												scales.x = d3
														.scaleTime()
														.domain([timelineBegin, timelineEnd]);
												scales.x1 = d3
														.scaleTime()
														.domain([timelineBegin, timelineEnd]);
												scales.x2 = d3.scaleTime();
										} else {
												scales.x = d3
														.scaleLinear()
														.domain([timelineBegin, timelineEnd]);
												scales.x1 = d3
														.scaleLinear()
														.domain([timelineBegin, timelineEnd]);
												scales.x2 = d3.scaleLinear();
										}
										break;

								case DATA_TYPE.NUMBER || DATA_TYPE.MONEY:
										scales.x = d3
												.scaleLinear()
												.domain([timelineBegin, timelineEnd]);
										scales.x1 = d3
												.scaleLinear()
												.domain([timelineBegin, timelineEnd]);
										scales.x2 = d3.scaleLinear();
										break;

								default:
										break;
						}
						return scales;
				};

				const scales = defineScales(rangeDataType);
				chartConfigs.scales = scales;
				chartConfigs.hasParseAxisData = parseToDateTimeFormat;

				return chartConfigs;
		}
}