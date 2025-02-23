/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { htmlIdGenerator, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo } from 'react';
import { useExistingFieldsReader, getFieldIconType } from '@kbn/unified-field-list';
import {
  FieldOption,
  FieldOptionValue,
  FieldPicker,
  useDebouncedValue,
  NewBucketButton,
  DragDropBuckets,
  DraggableBucketContainer,
  FieldsBucketContainer,
  isFieldLensCompatible,
} from '@kbn/visualization-ui-components';
import { DataView } from '@kbn/data-views-plugin/common';
import type { QueryPointEventAnnotationConfig } from '@kbn/event-annotation-common';

export const MAX_TOOLTIP_FIELDS_SIZE = 2;

const generateId = htmlIdGenerator();
const supportedTypes = new Set(['string', 'boolean', 'number', 'ip', 'date']);

export interface FieldInputsProps {
  currentConfig: QueryPointEventAnnotationConfig;
  setConfig: (config: QueryPointEventAnnotationConfig) => void;
  dataView: DataView;
  invalidFields?: string[];
}

interface WrappedValue {
  id: string;
  value: string | undefined;
  isNew?: boolean;
}

type SafeWrappedValue = Omit<WrappedValue, 'value'> & { value: string };

function removeNewEmptyField(v: WrappedValue): v is SafeWrappedValue {
  return v.value != null;
}

export function TooltipSection({
  currentConfig,
  setConfig,
  dataView,
  invalidFields,
}: FieldInputsProps) {
  const { hasFieldData } = useExistingFieldsReader();
  const onChangeWrapped = useCallback(
    (values: WrappedValue[]) => {
      setConfig({
        ...currentConfig,
        extraFields: values.filter(removeNewEmptyField).map(({ value }) => value),
      });
    },
    [setConfig, currentConfig]
  );
  const { wrappedValues, rawValuesLookup } = useMemo(() => {
    const rawValues = currentConfig.extraFields ?? [];
    return {
      wrappedValues: rawValues.map((value) => ({ id: generateId(), value })),
      rawValuesLookup: new Set(rawValues),
    };
  }, [currentConfig]);

  const { inputValue: localValues, handleInputChange } = useDebouncedValue<WrappedValue[]>({
    onChange: onChangeWrapped,
    value: wrappedValues,
  });

  const onFieldSelectChange = useCallback(
    (choice, index = 0) => {
      const fields = [...localValues];

      if (dataView.getFieldByName(choice.field)) {
        fields[index] = { id: generateId(), value: choice.field };

        // update the layer state
        handleInputChange(fields);
      }
    },
    [localValues, dataView, handleInputChange]
  );

  const newBucketButton = (
    <NewBucketButton
      className="lnsConfigPanelAnnotations__addButton"
      data-test-subj={`lnsXY-annotation-tooltip-add_field`}
      onClick={() => {
        handleInputChange([...localValues, { id: generateId(), value: undefined, isNew: true }]);
      }}
      label={i18n.translate('eventAnnotationComponents.xyChart.annotation.tooltip.addField', {
        defaultMessage: 'Add field',
      })}
      isDisabled={localValues.length > MAX_TOOLTIP_FIELDS_SIZE}
    />
  );

  if (localValues.length === 0) {
    return (
      <>
        <EuiFlexItem grow={true}>
          <EuiPanel
            color="subdued"
            paddingSize="s"
            className="lnsConfigPanelAnnotations__noFieldsPrompt"
          >
            <EuiText color="subdued" size="s" textAlign="center">
              {i18n.translate('eventAnnotationComponents.xyChart.annotation.tooltip.noFields', {
                defaultMessage: 'None selected',
              })}
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
        {newBucketButton}
      </>
    );
  }

  const options = dataView.fields
    .filter(isFieldLensCompatible)
    .filter(
      ({ displayName, type }) =>
        displayName && !rawValuesLookup.has(displayName) && supportedTypes.has(type)
    )
    .map(
      (field) =>
        ({
          label: field.displayName,
          value: {
            type: 'field',
            field: field.name,
            dataType: getFieldIconType(field),
          },
          exists: dataView.id ? hasFieldData(dataView.id, field.name) : false,
          compatible: true,
          'data-test-subj': `lnsXY-annotation-tooltip-fieldOption-${field.name}`,
        } as FieldOption<FieldOptionValue>)
    )
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <DragDropBuckets
        onDragEnd={(updatedValues: WrappedValue[]) => {
          handleInputChange(updatedValues);
        }}
        droppableId="ANNOTATION_TOOLTIP_DROPPABLE_AREA"
        items={localValues}
        bgColor="subdued"
      >
        {localValues.map(({ id, value, isNew }, index, arrayRef) => {
          const fieldIsValid = value ? Boolean(dataView.getFieldByName(value)) : true;

          return (
            <DraggableBucketContainer
              id={(value ?? 'newField') + id}
              key={(value ?? 'newField') + id}
              idx={index}
              onRemoveClick={() => {
                handleInputChange(arrayRef.filter((_, i) => i !== index));
              }}
              removeTitle={i18n.translate(
                'eventAnnotationComponents.xyChart.annotation.tooltip.deleteButtonLabel',
                {
                  defaultMessage: 'Delete',
                }
              )}
              isNotDraggable={arrayRef.length < 2}
              Container={FieldsBucketContainer}
              isInsidePanel={true}
              data-test-subj={`lnsXY-annotation-tooltip-${index}`}
            >
              <FieldPicker
                selectedOptions={
                  value
                    ? [
                        {
                          label: value,
                          value: { type: 'field', field: value },
                        },
                      ]
                    : []
                }
                options={options}
                onChoose={(choice) => {
                  onFieldSelectChange(choice, index);
                }}
                fieldIsInvalid={!fieldIsValid}
                className="lnsConfigPanelAnnotations__fieldPicker"
                data-test-subj={`lnsXY-annotation-tooltip-field-picker--${index}`}
                autoFocus={isNew && value == null}
              />
            </DraggableBucketContainer>
          );
        })}
      </DragDropBuckets>
      {newBucketButton}
    </>
  );
}
